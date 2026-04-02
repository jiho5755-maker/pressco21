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

on clickMessageField(appName)
	tell application "System Events"
		tell process appName
			try
				click text area 1 of window 1
				return true
			end try
			try
				click text field 1 of sheet 1 of window 1
				return true
			end try
			try
				click text area 1 of group 1 of window 1
				return true
			end try
			try
				set winSize to size of window 1
				set winPos to position of window 1
				set clickX to (item 1 of winPos) + ((item 1 of winSize) * 0.72)
				set clickY to (item 2 of winPos) + ((item 2 of winSize) * 0.93)
				click at {clickX, clickY}
				return true
			end try
			return false
		end tell
	end tell
end clickMessageField

on run argv
	if (count of argv) < 2 then
		error "usage: osascript send-kakaotalk-message.applescript <roomName> <messageText>"
	end if
	set roomName to item 1 of argv
	set messageText to item 2 of argv
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

	delay 1.2
	my clickMessageField(appName)
	delay 0.3

	tell application "System Events"
		keystroke messageText
		delay 0.3
		key code 36
	end tell
end run
