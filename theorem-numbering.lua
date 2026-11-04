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

Interactive-notes extensions (ported in spirit from the Ramat Gan Discrete Math notes):
  * .lecture-answer — an answer/solution INSIDE an example or question, hidden behind
                a click ("הצגת הפתרון" unless title= says otherwise). Implies .foldable.
                HTML: <details class="... lecture-answer">. PDF: the title as a bold
                label, then the content (no "אפשר לדלג" wrapper: answers are not asides).
  * .thmchk   — "בדיקה עצמית": a short self-check, UNNUMBERED, usually holding .quiz.
  * .thmsummary — "סיכום" at the end of a section, UNNUMBERED.
  * .quiz     — a click-to-answer question:
                    ::: {.quiz options="נכון|לא נכון" answer="לא נכון"}
                    explanation, shown once the reader has answered
                    :::
                options= is "|"-separated (default נכון|לא נכון; math allowed);
                answer= is one of the options. HTML: the .tf-quiz buttons (script in
                _styles.html). PDF: "תשובה: <answer>." followed by the explanation.
  * .solve    — a step-by-step solution: child divs `::: hint` and `::: step`. The
                script in _styles.html reveals them one at a time. PDF: everything
                shown, hints labelled "רמז", steps "צעד k".

Reader-input extensions (made interactive by assets/interactive.js; its header has
the details):
  * [shown answer]{.blank ans="..."} — a fill-in blank. A run of math and blanks is
                one formula: HTML wraps it in an LTR span (.fill-ltr), PDF merges it
                into ONE formula with the answers underlined. A lone blank prints
                underlined.
  * .fill     — groups blanks; child divs `::: hint`, `::: explain`. PDF: hints
                labelled "רמז". .eqline: a centred line (PDF: display math).
  * .steps    — the step builder (start=, rules=, ...); child divs `::: hint` and
                `::: solution`. PDF: the solution labelled "פתרון".
  * .order    — `::: step` children in the right order, shuffled on the page.
                PDF: the steps in order, labelled "צעד k".

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
  thmwarn    = { word = "שימו לב",     css = "warning"    },
  thmkey     = { word = "חשוב לזכור",  css = "key-point"  },
  thmchk     = { word = "בדיקה עצמית", css = "self-check" },
  thmsummary = { word = "סיכום",       css = "summary"    },
}

local ICONS = { method = true, calc = true, rule = true, convention = true, idea = true }
local ROLE_WORD = {
  method     = "שיטת הוכחה",
  calc       = "שיטת חישוב",
  rule       = "כלל",
  convention = "מוסכמה",
}

-- Per-document state, set in Pandoc() below (declared here so every helper sees it).
local chap, section, item, is_html

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
  -- No "." after a title that already ends a sentence (also behind a closing quote),
  -- so a question title stays "...?" and not "...?.".
  local ending = pandoc.utils.stringify(inlines):gsub("%s+$", "")
  local stripped = true
  while stripped do
    stripped = false
    for _, quote in ipairs({ '"', "'", "״", "”", "’" }) do
      if ending:sub(-#quote) == quote then
        ending = ending:sub(1, -#quote - 1):gsub("%s+$", "")
        stripped = true
        break
      end
    end
  end
  if not ending:match("[.!?:;]$") and ending:sub(-#"…") ~= "…" then
    inlines[#inlines + 1] = pandoc.Str(".")
  end
  return pandoc.Para({ pandoc.Strong(inlines) })
end

-- "$x$" -> "\(x\)" and HTML-escaped, for text we emit as raw HTML.
local function raw_html_text(s)
  s = s:gsub("&", "&amp;"):gsub("<", "&lt;"):gsub(">", "&gt;"):gsub('"', "&quot;")
  return (s:gsub("%$([^%$]+)%$", "\\(%1\\)"))
end

local function split_options(s)
  local opts = {}
  for o in (s .. "|"):gmatch("([^|]*)|") do
    o = o:gsub("^%s+", ""):gsub("%s+$", "")
    if o ~= "" then opts[#opts + 1] = o end
  end
  return opts
end

-- .quiz: buttons in HTML, the answer spelled out in PDF (see the header).
local function build_quiz(b)
  local opts = split_options((b.attributes and b.attributes.options) or "נכון|לא נכון")
  local answer = b.attributes and b.attributes.answer or ""
  local correct = nil
  for i, o in ipairs(opts) do if o == answer then correct = i end end
  if not correct then correct = tonumber(answer) end
  if not correct or not opts[correct] then
    io.stderr:write("theorem-numbering.lua: .quiz answer='" .. answer ..
      "' is not one of its options\n")
    correct = 1
  end
  if is_html then
    local buttons = {}
    for i, o in ipairs(opts) do
      buttons[#buttons + 1] = '<button type="button" class="tf-opt" data-val="' .. i ..
        '">' .. raw_html_text(o) .. '</button>'
    end
    local out = { pandoc.RawBlock("html",
      '<div class="tf-quiz" data-correct="' .. correct .. '">\n' ..
      table.concat(buttons, "\n") ..
      '\n<div class="tf-feedback" aria-live="polite"></div>\n<div class="tf-why">') }
    for _, x in ipairs(b.content) do out[#out + 1] = x end
    out[#out + 1] = pandoc.RawBlock("html", '</div>\n</div>')
    return out
  end
  -- Print: the explanation always states the answer, so it just gets a bold
  -- "תשובה:" in front (or the bare answer, if there is no explanation).
  local label = pandoc.Strong({ pandoc.Str("תשובה:") })
  local first = b.content[1]
  if first and (first.t == "Para" or first.t == "Plain") then
    table.insert(first.content, 1, pandoc.Space())
    table.insert(first.content, 1, label)
    return b.content
  end
  local lead = { label, pandoc.Space() }
  for _, il in ipairs(title_inlines(opts[correct])) do lead[#lead + 1] = il end
  lead[#lead + 1] = pandoc.Str(".")
  local out = { pandoc.Para(lead) }
  for _, x in ipairs(b.content) do out[#out + 1] = x end
  return out
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

-- Put a bold "<text>." at the start of a div's first paragraph (PDF labels in .solve).
local function prepend_label(div, text)
  local first = div.content[1]
  local strong = pandoc.Strong({ pandoc.Str(text .. ".") })
  if first and (first.t == "Para" or first.t == "Plain") then
    table.insert(first.content, 1, pandoc.Space())
    table.insert(first.content, 1, strong)
  else
    table.insert(div.content, 1, pandoc.Para({ strong }))
  end
end

-- ---- fill-in blanks (see the walk at the end of Pandoc()) ----
local function is_blank(il) return il.t == "Span" and has_class(il.classes, "blank") end

-- The answer inside a blank, as TeX for a merged print formula.
local function blank_tex(sp)
  local c = sp.content
  if #c == 1 and c[1].t == "Math" then return c[1].text end
  local s = pandoc.utils.stringify(sp)
  if s:match("^[%d%s%.%-%+/%(%)%[%],]*$") then return s end
  return "\\text{" .. s .. "}"
end

local function print_blank(sp)
  local out = { pandoc.RawInline("latex", "\\underline{") }
  for _, x in ipairs(sp.content) do out[#out + 1] = x end
  out[#out + 1] = pandoc.RawInline("latex", "}")
  return out
end

local function group_blanks(ils)
  local out, run = {}, {}
  local function flush()
    -- spaces at the edges of a run stay outside it
    local lead, trail = {}, {}
    while #run > 0 and run[1].t == "Space" do lead[#lead + 1] = table.remove(run, 1) end
    while #run > 0 and run[#run].t == "Space" do table.insert(trail, 1, table.remove(run)) end
    local nb, nm = 0, 0
    for _, x in ipairs(run) do
      if is_blank(x) then nb = nb + 1 elseif x.t == "Math" then nm = nm + 1 end
    end
    for _, x in ipairs(lead) do out[#out + 1] = x end
    if nb > 0 and nm > 0 then
      if is_html then
        out[#out + 1] = pandoc.Span(run, pandoc.Attr("", { "fill-ltr" }))
      else
        local parts = {}
        for _, x in ipairs(run) do
          if x.t == "Math" then parts[#parts + 1] = x.text
          elseif is_blank(x) then parts[#parts + 1] = "\\underline{" .. blank_tex(x) .. "}"
          else parts[#parts + 1] = " " end
        end
        out[#out + 1] = pandoc.Math("InlineMath", table.concat(parts, " "))
      end
    else
      for _, x in ipairs(run) do
        if is_blank(x) and not is_html then
          for _, y in ipairs(print_blank(x)) do out[#out + 1] = y end
        else
          out[#out + 1] = x
        end
      end
    end
    for _, x in ipairs(trail) do out[#out + 1] = x end
    run = {}
  end
  local touched = false
  for _, il in ipairs(ils) do
    if (il.t == "Math" and il.mathtype == "InlineMath") or il.t == "Space" or is_blank(il) then
      run[#run + 1] = il
      if is_blank(il) then touched = true end
    else
      flush()
      out[#out + 1] = il
    end
  end
  flush()
  if not touched then return nil end
  return pandoc.Inlines(out)
end

local process

process = function(blocks, in_optional)
  local out = {}
  for _, b in ipairs(blocks) do
    if b.t == "Div" and has_class(b.classes, "quiz") then
      b.content = process(b.content, in_optional)
      for _, x in ipairs(build_quiz(b)) do out[#out + 1] = x end
    elseif b.t == "Header" and b.level == 1 and not in_optional then
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
      local is_answer   = has_class(orig, "lecture-answer")
      local do_collapse = has_class(orig, "foldable") or has_class(orig, "optional") or is_answer   -- NB: not "collapse" (Bootstrap owns that; it sets display:none)
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
          local labelled = has_class(orig, "solve") or has_class(orig, "fill")
            or has_class(orig, "steps") or has_class(orig, "order")
          if labelled and not is_html then
            -- Print: everything is shown. Hints say "רמז", steps are numbered in
            -- their (correct) source order, a step builder's model solution says "פתרון".
            local k = 0
            for _, c in ipairs(b.content) do
              if c.t == "Div" and has_class(c.classes, "hint") then
                prepend_label(c, "רמז")
              elseif c.t == "Div" and has_class(c.classes, "step") then
                k = k + 1
                -- an ordering exercise may list numbers, not steps: just "k."
                prepend_label(c, has_class(orig, "order") and tostring(k) or ("צעד " .. k))
              elseif c.t == "Div" and has_class(c.classes, "solution") then
                prepend_label(c, "פתרון")
              end
            end
          end
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
        if is_answer then
          summary = (t and t ~= "") and t or "הצגת הפתרון"
          attrs = ' class="thmcollapse thmfoldable lecture-answer"'
        elseif is_proof then
          summary = "הוכחה"
          attrs = ' class="thmcollapse"'
        elseif is_solution then
          summary = "הצגת הפתרון"
          attrs = ' class="thmcollapse lecture-answer lecture-solution"'
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
        if is_answer then
          -- An answer is not an aside: print it with its title as a plain label.
          local t = b.attributes and b.attributes.title
          table.insert(b.content, 1, label_para((t and t ~= "") and t or "פתרון"))
        elseif do_collapse and not has_class(orig, "optional") and not is_proof and not is_solution then
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

  -- Fill-in blanks [answer]{.blank ans="..."} (made interactive by assets/interactive.js).
  -- A blank sitting between pieces of math, e.g. $(x -{}$[2]{.blank ans=2}$)^2$, belongs
  -- to ONE formula. In an RTL paragraph the pieces would be laid out right to left, so the
  -- formula would read backwards: HTML wraps the whole run in an LTR span; the PDF merges
  -- it into a single formula with the answer underlined. A lone blank prints underlined.
  doc = doc:walk({
    Inlines = function(ils) return group_blanks(ils) end,
    Div = function(d)
      -- a centred line of a computation: in print, a lone formula becomes display math
      if not is_html and has_class(d.classes, "eqline") and #d.content == 1
        and (d.content[1].t == "Para" or d.content[1].t == "Plain") then
        local c = d.content[1].content
        if #c == 1 and c[1].t == "Math" then
          return pandoc.Para({ pandoc.Math("DisplayMath", c[1].text) })
        end
      end
    end
  })
  return doc
end
