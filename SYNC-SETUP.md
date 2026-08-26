# Flowy sync setup (one time, ~10 minutes)

Flowy can keep your phone, the website, and the desktop widget all reading the
**same** flows by syncing through a free Google **Firebase** database. You set
up a tiny Firebase project once, paste its config into Flowy on one device,
then link your other devices with a single paste.

Your Firebase "config" is **not a password** — it's safe to keep in the app.
Your data is protected by a private **sync code** that only your devices know.

---

## Part A — Create the free Firebase project (once)

1. Go to <https://console.firebase.google.com/> and sign in with your Google
   account.
2. Click **Add project** (or **Create a project**). Give it a name like
   `flowy`. You can **turn off Google Analytics** — it isn't needed. Click
   **Create project**, then **Continue**.

### Turn on the database

3. In the left sidebar, open **Build → Realtime Database**.
4. Click **Create Database**.
   - Pick the location closest to you.
   - Choose **Start in locked mode** → **Enable**.
5. Open the **Rules** tab, replace everything with the rules below, and click
   **Publish**:

   ```json
   {
     "rules": {
       "flows": {
         "$code": {
           ".read": "auth != null",
           ".write": "auth != null"
         }
       }
     }
   }
   ```

### Turn on anonymous sign-in

6. In the sidebar, open **Build → Authentication → Get started**.
7. On the **Sign-in method** tab, click **Anonymous**, toggle it **Enable**,
   and **Save**. (This lets your devices connect without you making an
   account or password.)

### Get your config

8. Click the **gear icon → Project settings** (top-left).
9. Scroll to **Your apps** and click the **web** icon **`</>`**.
10. Give it a nickname (`flowy-web`), **do not** check Firebase Hosting, and
    click **Register app**.
11. Firebase shows a code block with `const firebaseConfig = { … }`. **Copy the
    whole `{ … }` object** (from the `{` through the `}`). That's what you paste
    into Flowy next.

---

## Part B — Turn on sync in Flowy

Do this **first on the device that has the flows you want to keep** (probably
your phone), so that copy becomes the source everyone else pulls from.

1. Open Flowy → tap the **`tune`** (settings) icon → scroll to **Sync across
   devices**.
2. Paste the `firebaseConfig { … }` you copied into the box.
3. (Optional) type a **sync code** — or leave it blank and Flowy makes a random
   private one for you.
4. Tap **Connect**. The status should turn green: **Connected · syncing**.
   Your current flows are now uploaded.

## Part C — Link your other devices (one paste each)

1. On the device that's already connected: **Settings → Sync → Copy device
   link**. This copies one long code containing the config **and** your sync
   code.
2. Send it to your other device (text it to yourself, AirDrop, email — whatever
   is easy).
3. On the other device: open Flowy → **Settings → Sync**, paste it into the
   box, tap **Connect**. It pulls down the same flows and stays in sync from
   then on.

Repeat Part C for every device (phone, Mac widget, browser).

---

## How it behaves

- **Offline still works.** Each device keeps a local copy; changes sync when
  it's back online.
- **Last edit wins.** If you edit the same flow on two devices, the most recent
  change is the one that sticks — so edit one device at a time.
- **Turn it off** anytime: Settings → Sync → *Turn off sync on this device*.
  Your data stays on that device; it just stops syncing.

## Troubleshooting

- **Status shows "Not connected."** Double-check the `databaseURL` is present in
  the config you pasted, that you **published the rules**, and that
  **Anonymous** sign-in is enabled. Then tap **Retry connection**.
- **Other device didn't get my flows.** Make sure both devices show the **same
  sync code** (Settings → Sync). Re-paste the device link if not.
