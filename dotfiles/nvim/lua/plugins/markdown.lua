return {
  "iamcco/markdown-preview.nvim",
  ft = { "markdown" },
  cmd = { "MarkdownPreview", "MarkdownPreviewStop", "MarkdownPreviewToggle" },
  build = function()
    vim.fn["mkdp#util#install"]()
  end,
  keys = {
    { "<leader>pm", "<CMD>MarkdownPreviewToggle<CR>", ft = "markdown", desc = "Toggle markdown preview" },
  },
  init = function()
    vim.g.mkdp_auto_close = 1        -- close the browser tab when leaving the buffer
    vim.g.mkdp_theme = "dark"
    vim.g.mkdp_open_to_the_world = 0 -- only serve on localhost
    vim.g.mkdp_echo_preview_url = 1
    vim.g.mkdp_preview_options = {
      disable_sync_scroll = 0,
      sync_scroll_type = "middle",
    }
  end,
}
