# Managing Multi-User Support

:::caution

This feature requires you to have set up an [OpenID Provider](/docs/config/oauth-auth). The usernames which people will log into your Actual instance will be fetched from the provider.

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

## User Access Management

Use this page to manage user access to the current open budget file.

:::info
The **User Access Management** menu is only visible from within an open budget:

![](/img/multiuser/user-access.webp)

:::

This screen is where you assign, give and revoke budget access and transfer ownership:

![](/img/multiuser/user-access-overview.webp)
