on waitFrontmost(appName, timeoutSec)
	set deadline to (current date) + timeoutSec
	tell application "System Events"
		repeat until (current date) > deadline
			if exists process appName then
				tell process appName
					if frontmost is true then return true
				end tell
			end if
			delay 0.2
		end repeat
	end tell
	return false
end waitFrontmost

on clickSearchField(appName)
	tell application "System Events"
		tell process appName
			try
				click text field 1 of window 1
				return true
			end try
			try
				click text field 1 of group 1 of window 1
				return true
			end try
			try
				click text field 1 of splitter group 1 of window 1
				return true
			end try
			return false
		end tell
	end tell
end clickSearchField

on run argv
	if (count of argv) < 1 then error "usage: osascript kakaotalk-debug-open-room.applescript <query>"
	set roomName to item 1 of argv
	set appName to "KakaoTalk"

	tell application appName to activate
	delay 1.5
	if my waitFrontmost(appName, 5) is false then error "KakaoTalk frontmost timeout"

	tell application "System Events"
		tell process appName
			set frontmost to true
			key code 53
			delay 0.2
			keystroke "f" using {command down}
		end tell
	end tell

	delay 0.8
	my clickSearchField(appName)
	delay 0.3

	tell application "System Events"
		keystroke "a" using {command down}
		delay 0.1
		key code 51
		delay 0.2
		keystroke roomName
		delay 1.2
		key code 36
	end tell
end run
