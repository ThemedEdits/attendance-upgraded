# Attendance Register

A free-stack attendance app using Firebase Authentication, Google Sheets, Google Apps Script, and a static Vercel frontend.

## New student enrollment flow

1. A student creates an account with their email and a strong password.
2. The password is stored only by Firebase Authentication. It is never written to Google Sheets.
3. After signup, the student completes their profile with:
   - Full name
   - Seat number
   - Class selection
4. The student sees available classes, not individual subjects.
5. The student sends one class access request.
6. A CR or teacher assigned to that class sees the request in the staff dashboard.
7. The CR or teacher approves or rejects the request.
8. On approval, the backend creates the student in the `Students` sheet and syncs them into every subject register for that class.
9. The student can then sign in and use the attendance dashboard for the entire class.

## Google Sheet structure

Keep these sheets in the same spreadsheet.

### Students

Recommended headers:

| StudentID (seat number) | Name | Email | ClassID | Status |
|---|---|---|---|---|
| 23122214 | Student Name | student@example.com | CLS001 | Active |

The `StudentID` is the student's actual seat number. Do not add a separate `SeatNumber` column to the `Students` sheet. Existing student rows do not need to be recreated.

### Teachers

Recommended headers:

| TeacherID | Name | Email | Role | AssignedClassIDs | AssignedSubjectIDs |
|---|---|---|---|---|---|
| TCH001 | Teacher Name | teacher@example.com | Teacher | CLS001 | SUB001,SUB002 |
| TCH002 | CR Name | cr@example.com | CR | CLS001 | |

`AssignedClassIDs` and `AssignedSubjectIDs` are retained for compatibility with existing sheets. Staff accounts can manage all classes, subjects, students, and enrollment requests.

### Classes

| ClassID | ClassName | AcademicYear |
|---|---|---|
| CLS001 | BSCS - 6 | 2026 |

### Subjects

| SubjectID | SubjectName | TeacherID | ClassID |
|---|---|---|---|
| SUB001 | Operating Systems | TCH001 | CLS001 |

### EnrollmentRequests

The backend creates this sheet automatically if it does not exist.

| RequestID | Name | Email | SeatNumber | ClassID | Status | RequestedAt | ReviewedAt | ReviewedBy | DecisionNote |
|---|---|---|---|---|---|---|---|---|---|

Possible status values are `Pending`, `Approved`, and `Rejected`.

### Attendance

The old flat attendance sheet can remain for migration. The live register uses one grid sheet per subject.

### Settings

| Key | Value |
|---|---|
| AdminEmails | admin@example.com,another@example.com |

`Setting` can also be used instead of `Key` because the backend accepts both.

## Apps Script setup

1. Open the Google Sheet.
2. Go to Extensions, then Apps Script.
3. Replace the Apps Script code with `backend/Code.gs` from this project.
4. In Project Settings, add this Script Property:
   - Name: `FIREBASE_API_KEY`
   - Value: your Firebase Web API key
5. Run `authorizeExternalRequests` once and grant the requested permission.
6. Run `setupEnrollmentSystem` once. This creates `EnrollmentRequests` and adds the required enrollment columns if they are missing.
7. Deploy as a Web app.
8. Execute as: Me.
9. Who has access: Anyone.
10. Put the deployed `/exec` URL into `js/api.js` as `APPS_SCRIPT_URL`.
11. Whenever `Code.gs` changes, create a new deployment version.

The backend creates `EnrollmentRequests` automatically the first time it needs it. `SeatNumber` is used only on pending enrollment requests; approved students store that value as `StudentID`.

## Firebase Authentication

Enable Email/Password authentication for student signup.

Google sign-in can remain enabled for existing staff or existing accounts. New student signup is intentionally handled through email and password so every new student gets a Firebase password that meets the app's strength requirements.

Passwords are never stored in Sheets and never sent to Apps Script.

## Frontend deployment

The frontend is plain HTML, CSS, and JavaScript. Deploy the project to Vercel with no build step.

## Main files

```text
index.html
student-onboarding.html
student.html
teacher.html
not-registered.html
css/styles.css
js/login.js
js/student-onboarding.js
js/student.js
js/teacher.js
js/api.js
js/guard.js
js/firebase-init.js
backend/Code.gs
```

## Security notes

The Apps Script endpoint is public, so the frontend is not trusted for authorization.

Every request carries a Firebase ID token. Apps Script verifies the token against Firebase, resolves the account from Google Sheets, and checks the requested class or subject again on the server.

Students can only read their own attendance records.

Enrollment approval is server-side. A student cannot approve their own request by changing browser code or request parameters.

Attendance writes are also server-side and are limited to classes the staff member is allowed to manage.

## UI fixes included

- Login error panel is hidden until an actual error occurs.
- Login hero content is layered above its decorative gradient so text remains readable.
- Student signup now includes strong-password validation and a live strength checklist.
- Student onboarding uses class selection instead of subject selection.
- Staff dashboard includes enrollment request approval and rejection.
- Students can check the status of their request.
- Responsive layouts were added for the new enrollment flow.
- Essential metadata, Open Graph tags, Twitter preview tags, icons, and manifest references are included in every HTML page.
- No em dash character is used anywhere in the project.
