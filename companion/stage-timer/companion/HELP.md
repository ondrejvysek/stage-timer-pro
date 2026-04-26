Stage Timer Pro Module

This is a custom Bitfocus Companion module built to control the Raspberry Pi Stage Timer Pro API.

Features

Toggle Start / Pause

Reset to specific times (e.g., 5m, 10m)

Add/Subtract time on the fly

Toggle Stage Messages on and off

Smart Feedbacks: Buttons will automatically turn Green, Yellow (under 2m), and Red (0s) based on the live API polling.

Phase 3 Rundown controls:

- Run Current Segment
- Next Segment
- Previous Segment
- Variables for current rundown segment, index, and length

Configuration

Enter the IP address of the Raspberry Pi running the timer server.

If your Stage Timer Pro instance uses admin protection, also enter the optional **Admin Token** in the module settings.  
The module sends this token in the `x-stage-timer-token` header for protected v2 API routes.

If your server is running in strict **v2-only mode**, enable the module's **v2-only mode** checkbox to disable legacy GET fallbacks.
