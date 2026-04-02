local appName = "KakaoTalk"
local roomName = "jin"

local function press(mods, key)
  hs.eventtap.keyStroke(mods, key, 0)
end
local function typeText(txt)
  hs.eventtap.keyStrokes(txt)
end

local app = hs.application.get(appName) or hs.application.launchOrFocus(appName)
if not app then print("APP_NOT_FOUND") return end

hs.timer.doAfter(1.5, function()
  app = hs.application.get(appName)
  if not app then print("APP_NOT_RUNNING") return end
  app:activate(true)
  local win = app:mainWindow() or app:focusedWindow()
  if not win then print("WINDOW_NOT_FOUND") return end
  win:focus()
  hs.timer.usleep(800000)
  press({"cmd"}, "f")
  hs.timer.usleep(700000)
  press({"cmd"}, "a")
  hs.timer.usleep(100000)
  press({}, "delete")
  hs.timer.usleep(150000)
  typeText(roomName)
  print("SEARCH_TYPED")
end)
