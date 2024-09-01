local wezterm = require 'wezterm'
local action = wezterm.action
local session_manager = require('wezterm-session-manager/session-manager')

wezterm.on('save_session', function(window) session_manager.save_state(window) end)
wezterm.on('load_session', function(window) session_manager.load_state(window) end)
wezterm.on('restore_session', function(window) session_manager.restore_state(window) end)
wezterm.on('gui-startup', function(cmd)
  local tab, pane, window = wezterm.mux.spawn_window(cmd or {})
  -- Not affected on Wayland
  window:gui_window():set_position(100, 50)
end)
wezterm.on('update-status', function(window, _)
  -- Grab the utf8 character for the "powerline" left facing solid arrow.
  local SOLID_LEFT_ARROW = utf8.char(0xe0b2)

  local color_scheme = window:effective_config().resolved_palette
  local fg = color_scheme.foreground
  local bg = wezterm.color.parse(color_scheme.background)
  local segments = {
    window:active_workspace(),
    wezterm.strftime('%a %b %-d %H:%M'),
    wezterm.hostname(),
  }

  local gradient = wezterm.color.gradient(
    {
      orientation = 'Horizontal',
      colors = { bg:lighten(0.2), bg },
    },
    #segments
  )

  local elements = {}
  table.insert(elements, { Background = { Color = 'none' } })
  for i, seg in ipairs(segments) do
    table.insert(elements, { Foreground = { Color = gradient[i] } })
    table.insert(elements, { Text = SOLID_LEFT_ARROW })
    table.insert(elements, { Foreground = { Color = fg } })
    table.insert(elements, { Background = { Color = gradient[i] } })
    table.insert(elements, { Text = ' ' .. seg .. ' ' })
  end
  window:set_right_status(wezterm.format(elements))
end)


local config = wezterm.config_builder and wezterm.config_builder() or {}
if wezterm.target_triple == 'x86_64-pc-windows-msvc' then
  config.default_domain = 'WSL:Ubuntu-24.04'
end
config.enable_wayland = false -- only on linux
config.use_ime = true
config.font_size = 14
config.font = wezterm.font({ family = 'Migu 1M' })
config.cell_width = 1.05
config.window_close_confirmation = 'AlwaysPrompt'
config.enable_scroll_bar = true
config.initial_rows = 48
config.initial_cols = 180
config.default_cursor_style = 'BlinkingBlock'
config.color_scheme = 'Tokyo Night'
config.audible_bell = 'Disabled'
config.visual_bell = {
  fade_in_duration_ms = 10,
  fade_out_duration_ms = 10,
}
config.window_background_opacity = 0.9
config.window_decorations = 'RESIZE'
config.window_frame = {
  font = wezterm.font({ family = 'Migu 1M', weight = 'Regular' }),
  font_size = 10,
}

config.key_tables = {
  resize_panes = {
    { key = 'j', action = action.AdjustPaneSize({ 'Down', 3 }) },
    { key = 'k', action = action.AdjustPaneSize({ 'Up', 3 }) },
    { key = 'h', action = action.AdjustPaneSize({ 'Left', 3 }) },
    { key = 'l', action = action.AdjustPaneSize({ 'Right', 3 }) },
  },
  workspaces = {
    {
      key = 's',
      action = action.ShowLauncherArgs { flags = 'WORKSPACES' , title = 'Select workspace' },
    },
    {
      key = 'c',
      action = action.PromptInputLine {
        description = "(wezterm) Create new workspace:",
        action = wezterm.action_callback(function(window, pane, line)
          if line then
            window:perform_action(
              action.SwitchToWorkspace {
                name = line,
              },
              pane
            )
          end
        end),
      },
    },
    {
      key = 't',
      action = action.PromptInputLine {
        description = '(wezterm) Set workspace title:',
        action = wezterm.action_callback(function(win,pane,line)
          if line then
            wezterm.mux.rename_workspace(wezterm.mux.get_active_workspace(), line)
          end
        end),
      },
    },
  }
}

config.leader = { key = 'x', mods = 'CTRL', timeout_milliseconds = 1000 }
config.keys = {
  -- mux control
  {
    key = '\\',
    mods = 'LEADER',
    action = action.SplitHorizontal({ domain = 'CurrentPaneDomain' }),
  },
  {
    key = 's',
    mods = 'LEADER',
    action = action.SplitVertical({ domain = 'CurrentPaneDomain' }),
  },
  {
    key = 'r',
    mods = 'LEADER',
    action = action.ActivateKeyTable({
      name = 'resize_panes',
      one_shot = false,
      timeout_milliseconds = 1000,
    })
  },
  { key = 'j', mods = 'LEADER', action = action.ActivatePaneDirection('Down') },
  { key = 'k', mods = 'LEADER', action = action.ActivatePaneDirection('Up') },
  { key = 'h', mods = 'LEADER', action = action.ActivatePaneDirection('Left') },
  { key = 'l', mods = 'LEADER', action = action.ActivatePaneDirection('Right') },
  -- workspace
  {
    key = 'w',
    mods = 'LEADER',
    action = action.ActivateKeyTable({
      name = 'workspaces',
      one_shot = true,
      timeout_milliseconds = 1000,
    })
  },
  -- misc
  { key = 'F11', action = action.ToggleFullScreen },
  { key = 'a', mods = 'SHIFT|CTRL', action = action.ActivateCopyMode },
  -- session
  { key = 'S', mods = 'LEADER', action = action{EmitEvent = 'save_session'} },
  { key = 'L', mods = 'LEADER', action = action{EmitEvent = 'load_session'} },
  { key = 'R', mods = 'LEADER', action = action{EmitEvent = 'restore_session'} },
}

config.mouse_bindings = {
  {
    event = { Down = { streak = 1, button = 'Right' } },
    mods = 'NONE',
    action = action({ PasteFrom = 'Clipboard' }),
  },
}

return config
