# Managing Multi-User Support

:::caution

This feature requires you to have set up an [OpenID Provider](./oauth-auth.md). The usernames which people will log into your Actual instance will be fetched from the provider.

:::

## User Directory

Use this page to manage users who have access to the Actual Budget instance.

To access the **User Directory** page, access the menu from the server:

![](/img/multiuser/user-directory.webp)

Users can be added, disabled, enabled, removed from this page:

![](/img/multiuser/user-directory-overview.webp)

There are two user roles _Basic_ or _Admin_.

- The Basic role:
  Users with the Basic role can create new budgets and collaborate on budgets made by others.
  This role is ideal for users who primarily need to manage and participate in shared budget activities.

- The Admin role:
  This role can do everything the Basic user role can. It can also add new users to the user directory and allow all users to access budget files.
  The role can assign ownership of a budget to another person, ensuring efficient budget management.

## Bank Sync Credentials

[Bank sync](../advanced/bank-sync.md) credentials can be saved globally for the server or for one budget file only. Admins can manage global credentials and credentials for individual budget files.

Budget file owners who are not admins can manage bank sync credentials for their own budget file only. Users who have shared access to a budget file but are not the owner cannot manage bank sync credentials for that file.

## User Access Management

Use this page to manage user access to the current open budget file.

:::info
The **User Access Management** menu is only visible from within an open budget:

![](/img/multiuser/user-access.webp)

:::

This screen is where you assign, give and revoke budget access and transfer ownership:

![](/img/multiuser/user-access-overview.webp)
