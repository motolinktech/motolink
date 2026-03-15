# Motolink Features

## 📊 Progress

- 🗂️ Planned tasks: `81` (`100%`)
- ✅ Done: `37/81` (`46%`)
- 🟡 Partial: `12/81` (`15%`)
- 🚧 Started overall: `49/81` (`60%`)

> Audit based on the current codebase state on `2026-03-15`.

- `[x]` implemented and present in the codebase
- `[!]` partial, placeholder-only, or not exposed in the current app
- `[ ]` not implemented

## General

- [!] Upload images to firebase storage
- [x] Create seed script to help with local development
- [x] Global reload after branch change
- [ ] Block modules by permissions
- [ ] Block actions by permissions
- [ ] Block pages by permissions
- [!] Save mutations actions (CREATE/UPDATE/DELETE) on history-trace for all modules
- [!] Create test suites for all the services covering all methods
- [!] Create test suites for all utils files

## Authentication

- [x] Create private and public routes
- [!] Login with email & password (with error handling)
- [x] Secure the API endpoint to deny unauthorized/unauthenticated requests
  <!-- Uncertain: all current route handlers are protected, but server actions are not consistently validated through the same session-check path. -->

## Users (colaboradores)

- [x] Create a user
- [x] Edit a user
- [x] List users by branch with pagination
- [x] Search user by name and email
- [!] View user detail with the permissions table
- [ ] Display the logs of the user on the user detail
- [ ] Block and unblock a user
- [!] Send invitation to new user with link to create a password
- [ ] Page to create a password
- [ ] Page to change password
- [ ] Send forgot password link to user whatsapp

## Groups

- [x] Create a group
- [x] Edit a group
- [x] List groups by branch with pagination
- [x] Search group by name
- [ ] View group detail with clients related to it
- [x] Delete groups without relationships

## Regions

- [x] Create a region
- [x] Edit a region
- [x] List regions by branch with pagination
- [x] Search region by name
- [ ] View regions detail with clients/deliverymen related to it
- [x] Delete regions without relationships

## Clients/Commercial Conditions

- [x] Create a client with commercial conditions
- [x] Edit a client with commercial conditions
- [x] List client by branch with pagination
- [x] Search client by name and cnpj
- [x] View client details with commercial conditions
- [x] Soft-delete a client

## Deliverymen

- [x] Create a deliveryman
- [x] Edit a deliveryman
- [x] List deliveryman by branch with pagination
- [x] Search deliveryman by name and phone
- [!] View deliveryman details with logs
- [x] Block/Unblock a deliveryman
- [x] Soft-delete a deliveryman

## Client Block

- [ ] Block and unblock a deliveryman on a single client

## Planning

- [x] List planning information by week with filter by client or group
- [x] Create and edit planning information for a client by period

## Work Shift

- [x] Create work-shift by client
- [x] Edit a work-shift
- [x] List work-shift grouped by client
- [x] Change status following a defined flow (OPEN > INVITED > CONFIRMED > CHECKED_IN > PENDING_COMPLETION > COMPLETED)
- [!] Log all actions done on the work-shift
- [!] Send invitation by whatsapp to the deliveryman
- [ ] Send invitations by client
- [ ] Send invitations by group
- [ ] When the work-shift is marked as COMPLETED it should create a Payment Request
- [!] Delete work-shift
- [ ] When creating a new work-shift, it should give priority to deliverymen on the same region on the suggestion
- [ ] When creating a new work-shift, it should remove the deliveryman blocker on the client when suggesting
- [ ] Complete a work-shift automatically after a certain time when the status is CHECKED_IN

## Payment Request

- [ ] List all payment request by branch
- [ ] Search payment request by deliveryman, by date, by status
- [ ] Edit a payment request
- [ ] Approve payment request that was edited
- [ ] Deny a payment request
- [ ] View a payment request log

## Events

- [ ] Create a event
- [ ] Edit a event
- [ ] List events
- [ ] Delete a event

## History Trace

- [!] List history trace filtered by entity type, entity id, date period, action

## Notifications

- [ ] Warn user that it exists work-shift with status PENDING_COMPLETION
- [ ] Warn user about events
- [ ] Warn user about whatsapp disconnection

## Whatsapp

- [x] Send message with whatsapp using WAHA endpoint
- [ ] Get whatsapp instance status and display it together with the branch information
- [ ] Get the QR Code to connect whatsapp to WAHA instance
