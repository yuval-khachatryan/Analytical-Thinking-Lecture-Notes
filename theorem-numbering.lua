--[[
theorem-numbering.lua

One shared, section-scoped counter for numbered theorem-like boxes, numbered

    chapter.section.item        e.g.  2.4.1, 2.4.2, 2.4.3, 2.5.1, ...

as a single running sequence per "##" section. The boxes use classes Quarto does
NOT recognise (.thmdef/.thmthm/.thmprp/.thmexm/.thmlem/.thmcor), so Quarto leaves
them alone and this filter owns them: it prepends the numbered title and applies
the styling classes (.thmbox / .thmbox-<type>, defined in _styles.html for HTML).
The chapter number is read from the input filename NN-slug.qmd.

Extensions:
  * .thmsim   — interactive simulation. Numbered on the SAME running counter as
                everything else, which is why the box must exist in both formats:
                if it appeared only in HTML, every box after it in the section
                would carry a different number in the PDF. So the box itself is
                format-agnostic and only its contents are conditional — the
                iframe in HTML, a pointer to the online edition in print.
  * .thmproof — proof box: label "הוכחה." but UNNUMBERED; styled .thmbox-proof.
  * .thmsol   — solution to a .thmqst, and the same shape as .thmproof is to a
                theorem: label "פתרון." but UNNUMBERED, and a separate box that
                FOLLOWS the question rather than nesting inside it. Add .foldable
                to hide it behind a click; like a proof it is exempt from the
                "אפשר לדלג" print wrapper, since a solution is not skippable.
  * .optional — "רשות" wrapper: its inner boxes are labelled but UNNUMBERED
                (\newtheorem* style). Tinted via _styles.html (HTML) / the
                'optionalbox' LaTeX environment (PDF).
  * .thmwarn / .thmkey — ported from the BGU calculus book. Labelled, optionally
                titled, but UNNUMBERED and they never advance the counter.
                .thmwarn (שימו לב, red): a warning, a common mistake, or why a
                hypothesis is needed. .thmkey (חשוב לזכור, blue): an insight or a
                fact to carry forward. icon="idea|rule|calc|convention|method" adds
                a glyph in HTML (.thmicon-*) and, except for idea, a role word.
  * .foldable — in HTML the block is wrapped in <details> (click to reveal); in
                PDF it is shown as-is. (Marker class only; deliberately NOT named
                "collapse", which is a Bootstrap utility that forces display:none.)

The filter RECURSES into nested divs, so boxes inside .optional (or any wrapper)
are still labelled. Top-level boxes are numbered; boxes inside .optional are not.
]]

local BOX = {
  thmdef = { word = "הגדרה", css = "definition"  },
  thmthm = { word = "משפט",  css = "theorem"     },
  thmprp = { word = "טענה",  css = "proposition" },
  thmexm = { word = "דוגמה", css = "example"     },
  thmqst = { word = "שאלה",  css = "question"   },
  thmsim = { word = "סימולציה", css = "simulation" },
  thmlem = { word = "למה",   css = "lemma"       },
  thmcor = { word = "מסקנה", css = "corollary"   },
}

-- Labelled but UNNUMBERED (see the header).
local UNNUMBERED = {
  thmwarn = { word = "שימו לב",    css = "warning"   },
  thmkey  = { word = "חשוב לזכור", css = "key-point" },
}

local ICONS = { method = true, calc = true, rule = true, convention = true, idea = true }
local ROLE_WORD = {
  method     = "שיטת הוכחה",
  calc       = "שיטת חישוב",
  rule       = "כלל",
  convention = "מוסכמה",
}

-- id -> the label this filter gave that box, e.g. "שאלה 2.4.9". Used to fill in
-- cross-reference links written as [](#box-id), so a citation never carries a
-- hardcoded number that goes stale when a box is inserted above it.
local labels = {}

local function chapter_number()
  local f = quarto and quarto.doc and quarto.doc.input_file
  if not f then return nil end
  local base = tostring(f):match("([^/\\]+)$") or tostring(f)
  local nn = base:match("^(%d%d)%-")
  if nn then return tostring(tonumber(nn)) end   -- "03" -> "3"
  return nil
end

local function has_class(classes, name)
  for _, c in ipairs(classes) do if c == name then return true end end
  return false
end

local function box_for(classes)
  for _, c in ipairs(classes) do if BOX[c] then return BOX[c] end end
  return nil
end

-- Build the bold label paragraph: "<text> — <title>." (the title part is optional).
-- A title= attribute is a PLAIN STRING — pandoc never parses attribute values as
-- markdown — so injecting it as a Str would emit math verbatim ("$\pi$"). Parse it
-- as markdown here, so titles may contain math like "קירוב המספר $\pi$".
local function title_inlines(title)
  return pandoc.utils.blocks_to_inlines(pandoc.read(title, "markdown").blocks)
end

local function label_para(text, title)
  local inlines = { pandoc.Str(text) }
  if title and title ~= "" then
    inlines[#inlines + 1] = pandoc.Space()
    inlines[#inlines + 1] = pandoc.Str("—")
    inlines[#inlines + 1] = pandoc.Space()
    for _, il in ipairs(title_inlines(title)) do inlines[#inlines + 1] = il end
  end
  inlines[#inlines + 1] = pandoc.Str(".")
  return pandoc.Para({ pandoc.Strong(inlines) })
end

local function unnumbered_for(classes)
  for _, c in ipairs(classes) do if UNNUMBERED[c] then return UNNUMBERED[c] end end
  return nil
end

local function role_word(b, classes)
  if not has_class(classes, "thmkey") then return nil end
  local ic = b.attributes and b.attributes.icon
  return ic and ROLE_WORD[ic] or nil
end

local function icon_class(b)
  local ic = b.attributes and b.attributes.icon
  if ic and ICONS[ic] then return "thmicon-" .. ic end
  return nil
end

local chap, section, item, is_html
local process

process = function(blocks, in_optional)
  local out = {}
  for _, b in ipairs(blocks) do
    if b.t == "Header" and b.level == 1 and not in_optional then
      -- Chapter boundary. A book renders to HTML one chapter per pandoc pass (so the
      -- filename gives the number), but to PDF as ONE merged pass — where the filename
      -- is no longer NN-slug.qmd. So each chapter's `#` heading carries chapter="N",
      -- which works in both passes. Untagged H1s (parts, preface) leave `chap` alone.
      local n = b.attributes and b.attributes.chapter
      if n and n ~= "" then
        chap = n
        section = 0
        item = 0
      end
      out[#out + 1] = b
    elseif b.t == "Header" and b.level == 2 and not in_optional then
      section = section + 1
      item = 0
      out[#out + 1] = b
    elseif b.t == "Div" then
      local orig       = b.classes
      local do_collapse = has_class(orig, "foldable") or has_class(orig, "optional")   -- NB: not "collapse" (Bootstrap owns that; it sets display:none)
      local is_proof    = has_class(orig, "thmproof")
      local is_solution = has_class(orig, "thmsol")
      local is_remark   = has_class(orig, "thmrem")

      if is_proof then
        table.insert(b.content, 1, label_para("הוכחה"))   -- label_para adds the "."
        b.content = process(b.content, in_optional)
        b.classes = { "thmbox", "thmbox-proof" }
      elseif is_solution then
        table.insert(b.content, 1, label_para("פתרון"))
        b.content = process(b.content, in_optional)
        b.classes = { "thmbox", "thmbox-solution" }
      elseif is_remark then
        -- Remark box: NUMBERED (chapter.section.item) like the other boxes; an optional
        -- title= is folded into the label. Change `word` to rename the label everywhere.
        local word = "הערה"
        local text
        if in_optional or not chap then
          text = word                                    -- unnumbered fallback
        else
          item = item + 1
          text = word .. " " .. chap .. "." .. section .. "." .. item
        end
        local t = b.attributes and b.attributes.title
        if b.identifier and b.identifier ~= "" then labels[b.identifier] = text end
        table.insert(b.content, 1, label_para(text, t))
        b.content = process(b.content, in_optional)
        b.classes = { "thmbox", "thmbox-remark" }
      elseif has_class(orig, "extra") then
        -- Enrichment ("העשרה"): NOT foldable, part of the running text; inner boxes numbered
        -- (in_optional = false). A `## heading` inside becomes the box's header bar (a real
        -- numbered section, via makeSections). For a small aside with no heading, a `title=`
        -- attribute is rendered instead as a (non-section) header bar. Box look is pure CSS.
        local t = b.attributes and b.attributes.title
        if t and t ~= "" and not (b.content[1] and b.content[1].t == "Header") then
          table.insert(b.content, 1,
            pandoc.Div({ pandoc.Plain(title_inlines(t)) }, pandoc.Attr("", { "extra-title" })))
        end
        b.content = process(b.content, false)
        -- keep the .extra class for HTML/CSS
      elseif has_class(orig, "optional") then
        b.content = process(b.content, true)
        if not is_html then
          table.insert(b.content, 1, pandoc.RawBlock("latex", "\\begin{optionalbox}"))
          table.insert(b.content, pandoc.RawBlock("latex", "\\end{optionalbox}"))
        end
        -- keep the .optional class for HTML CSS
      elseif unnumbered_for(orig) then
        local u = unnumbered_for(orig)
        local text = role_word(b, orig) or u.word
        local t = b.attributes and b.attributes.title
        if b.identifier and b.identifier ~= "" then labels[b.identifier] = text end
        table.insert(b.content, 1, label_para(text, t))
        b.content = process(b.content, in_optional)
        b.classes = { "thmbox", "thmbox-" .. u.css }
      else
        local box = box_for(orig)
        if box then
          local text
          if in_optional or not chap then
            text = box.word                              -- unnumbered
          else
            item = item + 1
            text = box.word .. " " .. chap .. "." .. section .. "." .. item
          end
          local t = b.attributes and b.attributes.title  -- optional title, e.g. "סדרת פיבונאצ׳י"
          if b.identifier and b.identifier ~= "" then labels[b.identifier] = text end
          table.insert(b.content, 1, label_para(text, t))
          b.content = process(b.content, in_optional)
          b.classes = { "thmbox", "thmbox-" .. box.css }
        else
          b.content = process(b.content, in_optional)   -- generic wrapper: recurse
        end
      end

      local ic = icon_class(b)
      if ic then b.classes[#b.classes + 1] = ic end

      if do_collapse and is_html then
        -- title= supplies the <summary> text for .foldable and .optional alike. It is
        -- emitted as a RawBlock, so Pandoc never runs its readers over it: markdown in
        -- a title still does nothing, but math is handled just below.
        local t = b.attributes and b.attributes.title
        local summary = (t and t ~= "") and t or "הצג/הסתר"
        local attrs = ' class="thmcollapse thmfoldable"'
        if is_proof then
          summary = "הוכחה"
          attrs = ' class="thmcollapse"'
        elseif is_solution then
          summary = "פתרון"
          attrs = ' class="thmcollapse"'
        elseif has_class(orig, "optional") then
          summary = (t and t ~= "") and t or "קריאת רשות"
          attrs = ' class="thmcollapse thmoptional"'   -- collapsed by default (no "open")
        end
        -- Everywhere else Pandoc rewrites $x$ into \(x\) at build time, but not here:
        -- this is a RawBlock. MathJax 4's default inline delimiter is \(…\) and NOT $…$,
        -- so a title containing $x$ used to ship its dollar signs literally to the page.
        -- Convert them ourselves. The LaTeX branch below needs no such fix -- TeX reads
        -- $…$ natively -- so this stays inside the HTML branch.
        summary = summary:gsub("%$([^%$]+)%$", "\\(%1\\)")
        out[#out + 1] = pandoc.RawBlock("html", '<details' .. attrs .. '><summary>' .. summary .. '</summary>')
        out[#out + 1] = b
        out[#out + 1] = pandoc.RawBlock("html", '</details>')
      else
        -- PDF can't fold. Show .foldable content, but flag it as skippable so the print
        -- reader sees it is an aside. (.optional already got its own optionalbox above.)
        if do_collapse and not has_class(orig, "optional") and not is_proof and not is_solution then
          local t = b.attributes and b.attributes.title
          local label = (t and t ~= "") and t or "פירוט"
          table.insert(b.content, 1, pandoc.RawBlock("latex", "\\begin{foldablebox}{" .. label .. "}"))
          table.insert(b.content, pandoc.RawBlock("latex", "\\end{foldablebox}"))
        end
        out[#out + 1] = b
      end
    else
      out[#out + 1] = b
    end
  end
  return out
end

function Pandoc(doc)
  -- Seed from the filename (the HTML-per-chapter pass); in the merged PDF pass this is
  -- nil and each chapter's `#` heading sets it instead. Never bail out: a box met while
  -- `chap` is unknown still gets its label, just without a number.
  chap = chapter_number()
  section, item = 0, 0
  if quarto and quarto.doc and quarto.doc.is_format then
    is_html = quarto.doc.is_format("html")
  else
    is_html = (FORMAT ~= nil and FORMAT:match("html") ~= nil)
  end
  labels = {}
  doc.blocks = process(doc.blocks, false)

  -- Second pass, so FORWARD references work: an empty link [](#box-id) is met
  -- long before the box it points at is numbered. Links that already carry text
  -- are left alone.
  -- An editor that reformats markdown can turn [](#id) into [ ](#id); treat any
  -- whitespace-only link text as a placeholder so that does not silently break
  -- the reference.
  local function blank(inlines)
    for _, il in ipairs(inlines) do
      local ws = il.t == "Space" or il.t == "SoftBreak" or il.t == "LineBreak"
        or (il.t == "Str" and il.text:match("^%s*$") ~= nil)
      if not ws then return false end
    end
    return true
  end

  doc = doc:walk({
    Link = function(l)
      if blank(l.content) then
        local id = l.target:match("^#(.+)$")
        local lab = id and labels[id]
        if lab then
          return pandoc.Link(pandoc.Str(lab), l.target, l.title, l.attr)
        end
      end
    end
  })
  return doc
end
