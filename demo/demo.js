const { createEditor, plugins } = window.AtomiEditor
const output = document.querySelector('#output')
const panel = document.querySelector('#output-panel')
const toggle = document.querySelector('#toggle-html')
const editor = createEditor(document.querySelector('#editor'), {
  plugins,
  html: '<h2>Workshop notes</h2><p>Use the <strong>Thursday workshop</strong> to review the first draft with the team.</p><ul><li><p>Share the <a href="https://example.com/workshop">workshop agenda</a>.</p></li><li><p>Capture open questions and next steps.</p></li></ul>',
  onChange(html) { output.textContent = html },
})
output.textContent = editor.getHTML()
toggle.addEventListener('click', () => {
  panel.hidden = !panel.hidden
  toggle.setAttribute('aria-expanded', String(!panel.hidden))
  toggle.textContent = panel.hidden ? 'View HTML' : 'Hide HTML'
})
