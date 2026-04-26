# Acceptance criteria

## State persistence

Given a countdown is running
When the backend service restarts
Then the timer resumes from the correct absolute target time
And the presenter view displays the correct remaining time after reconnect.

Given the timer is paused
When the backend service restarts
Then the paused remaining seconds are preserved
And the timer does not start automatically.

Given a JSON state file is corrupt
When the backend starts
Then it attempts to recover from backup
And if backup fails it starts with defaults
And it logs the recovery event.

## Timer commands

Given the operator starts a 10 minute countdown
When the command succeeds
Then all connected clients receive running state
And the displayed value is calculated from target timestamp.

Given the operator adjusts the timer by plus 60 seconds
When the timer is running
Then target timestamp is moved by 60 seconds
And clients receive updated state.

## Rundown

Given a rundown has three items
When the operator selects item two
Then timer mode and duration are loaded from item two.

Given the active item is running
When the operator presses Next
Then actuals are written for the active item
And current index increments
And the next item is loaded.

Given the active item never started
When the operator presses Next
Then the item is marked skipped or no actual duration is written
And the next item is loaded.

## Display

Given key mode is chroma
When presenter view renders
Then the background is solid green
And timer content is visible.

Given position is 8
When presenter view renders
Then the timer appears in the bottom right grid cell.

Given scale changes
When presenter view renders
Then timer size changes without layout jump.

## Discovery

Given two Pis are on the same network
When discovery is enabled
Then each node advertises `_stagetimer._tcp`
And the dashboard lists each node by room name and UUID.

Given a node changes IP address
When discovery refreshes
Then the same UUID maps to the new address.

## Sync

Given a follower is connected to a leader
When the leader starts a countdown
Then the follower renders using the leader target timestamp and measured offset.

Given network latency changes
When round trip time becomes high
Then the sync quality indicator changes
And the display does not jump aggressively.

## Security

Given a request changes system settings
When the request has no valid token
Then the API returns unauthorized
And no change is applied.

Given a request contains invalid payload
When the endpoint validates it
Then the API returns a structured validation error
And no state is written.

Given a hostname change is requested
When the hostname contains unsafe characters
Then the request is rejected.

## Import and export

Given an event profile is exported
When it is imported on another Pi
Then config, display, rundown, and timer defaults load correctly
And the receiving Pi keeps its own UUID unless import explicitly includes identity replacement.

Given an import file is invalid
When import is attempted
Then existing files remain unchanged.

## NDI

Given NDI is disabled
When the timer starts
Then no NDI process is started.

Given NDI is enabled but FFmpeg lacks NDI support
When the service starts
Then timer operation continues
And NDI status is shown as unavailable.
