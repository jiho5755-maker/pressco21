local targetName = hs.settings.get("kakao_target_title") or "살람"
local messageText = hs.settings.get("kakao_message_text") or "ㅎㅇ"
local appName = "카카오톡"
local logPath = os.getenv("HOME") .. "/workspace/pressco21/openclaw-project-hub/06_scripts/kakaotalk-hs-debug.log"

local function log(msg)
  local f = io.open(logPath, "a")
  if f then
    f:write(os.date("%Y-%m-%d %H:%M:%S") .. " | " .. msg .. "\n")
    f:close()
  end
end

local function getApp()
  return hs.application.get(appName) or hs.appfinder.appFromName(appName) or hs.application.find(appName)
end

local function press(mods, key)
  hs.eventtap.keyStroke(mods, key, 0)
end

local function typeText(txt)
  hs.eventtap.keyStrokes(txt)
end

local function clickMainSearch(win)
  local f = win:frame()
  local x = f.x + 110
  local y = f.y + 85
  hs.mouse.absolutePosition({x=x, y=y})
  hs.eventtap.leftClick({x=x, y=y})
  log(string.format("clicked main search at %.0f,%.0f", x, y))
end

local function clickInputArea(win)
  local f = win:frame()
  local x = f.x + (f.w * 0.62)
  local y = f.y + (f.h * 0.94)
  hs.mouse.absolutePosition({x=x, y=y})
  hs.eventtap.leftClick({x=x, y=y})
  log(string.format("clicked input area at %.0f,%.0f", x, y))
end

local function findWindowByTitlePart(app, target)
  local wins = app:allWindows()
  for _, win in ipairs(wins) do
    local title = win:title() or ""
    log("window title seen: " .. title)
    if string.find(string.lower(title), string.lower(target), 1, true) then
      return win
    end
  end
  return nil
end

log("start target=" .. targetName .. " message=" .. messageText)
local app = getApp()
if not app then log("APP_NOT_FOUND") return end
log("app found: " .. (app:name() or "?"))

local wins = app:allWindows()
log("window count=" .. tostring(#wins))
if #wins == 0 then log("NO_WINDOWS") return end

local mainWin = wins[1]
for _, win in ipairs(wins) do
  local t = win:title() or ""
  if t == "카카오톡" or t == "KakaoTalk" or t == "" then
    mainWin = win
    break
  end
end

log("focus main window: " .. (mainWin:title() or "<empty>"))
mainWin:focus()
hs.timer.usleep(800000)
clickMainSearch(mainWin)
hs.timer.usleep(300000)
press({"cmd"}, "a")
press({}, "delete")
hs.timer.usleep(150000)
typeText(targetName)
log("typed target name")
hs.timer.usleep(1500000)
press({}, "return")
log("pressed return to open chat")
hs.timer.usleep(2500000)

app = getApp()
if not app then log("APP_LOST") return end
local targetWin = findWindowByTitlePart(app, targetName)
if not targetWin then
  log("TARGET_WINDOW_NOT_FOUND_AFTER_OPEN")
  return
end

log("focus target window: " .. (targetWin:title() or "<empty>"))
targetWin:focus()
hs.timer.usleep(700000)
clickInputArea(targetWin)
hs.timer.usleep(400000)
typeText(messageText)
log("typed message")
hs.timer.usleep(200000)
press({}, "return")
log("pressed return to send")
log("OPEN_AND_SEND_ATTEMPTED:" .. targetName)
