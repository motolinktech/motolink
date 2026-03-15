# Monitoring - Weekly View

This task will create the route "/operacional/monitoramento/semanal". It will be very similar to the @/src/app/(private)/operacional/monitoramento/diario/page.tsx, but spiritually mixed with the @/src/app/(private)/operacional/planejamento/page.tsx. It will have the same filters on top, it will have the same week navigation as the "/planjemanto", it will load a list of cards each card being one client with its informations on top, equal to the cards on the "/monitoramento/diario". The difference is that the content will display the seven days of the week and the deliveryman or plannings inside those days on a ball format, showing less information.

## Filters

It should have the filters on top, filtering by group ou by client. It also should have a date filter by week equal to the one @/src/app/(private)/operacional/planejamento/page.tsx. It should always start on the current week, with no group or client selected. It must show an alert that no group ou client is selected.

## Client Card

The card will be very similar to the @src/components/composite/monitoring-client-card.tsx, especially the header that will have the same information about commercial conditions but the content will be different. The content instead of being a list, it will be seven blocks for each day of the week, the block will have the name of the day (seg, Ter, Qua), the date and the information about assigned/planned. It will show the assigned and planned as balls, if it is a planned the ball the have dotted borders and will show an icon of user inside it (when clicked it will open the @src/components/forms/work-shift-slot-form.tsx), when it is a work-shift assigned it will show a ball with the two letters from the deliveryman name (you can use the @src/components/ui/avatar.tsx to achive this) and when is clicked it will open a @src/components/ui/dialog.tsx with the work-shift information. The ball (both assgined and planned) will have @src/components/ui/tooltip.tsx with some information to help the user identify it faster. The balls must be listed inline from the left to the right. It should also have one icon button that will be a plus to create one assigment for that day without it being planned. Remenber to create this with the best UX possible since it is a important screen on the app. It will be used most of the time on desktop, but it should be reponsible and adapted for mobile too.

- Follow the project patterns
- Plan this carefully
- Ask question to clarify the task
