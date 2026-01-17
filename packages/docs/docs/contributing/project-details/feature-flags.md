# Feature Flags (Experimental Features)

Feature flags (experimental features) are a way to enable or disable certain features in the application. This is useful when you want to test a feature with a small group of users before rolling it out to everyone. It is also useful when building a larger feature as it allows breaking it up in to smaller releasable chunks.

For example: `custom reports` initially was released as a read-only version under a feature flag. Later the saving functionality was added. This allowed us to put the feature in the hands of real users before announcing it as a stable first-party feature.

In short, feature flags allow:

- breaking up a large and complex feature into smaller deliverables
- releasing the feature to real users to gather their feedback

However, feature flags also have a downside. They can make the code more complex and harder to understand. They can also lead to technical debt if not managed properly. As such - we impose a strict policy for managing them.

**Experimental features that have not had any active development for over 3 months will be removed from the codebase.** This is to ensure the codebase does not become cluttered with unfinished features. If you wish to bring back an experimental feature that was removed - please feel free to bring it back as long as you can commit to helping with finishing it up for a first-party release.

Before removing an experimental feature flag - we will try our best to communicate with the original engineer/s who implemented it. However, if we cannot reach them - we will remove the feature flag.

The core maintainer team does not have the capacity to maintain a large number of experimental features. We also do not have capacity to finish up features that were abandoned by their original authors. However, we are happy to support you with your feature development if you are actively working on it.

## FAQ

### Can I use feature flags as a configuration option (i.e. to change a small visual or functional aspect of the product)?

No. Actual's design philosophy is: sleek and clutter-free. This includes the configuration page and the feature flags. We do not want to have a configuration option for each little UI quirk.

For example: should category selector include hidden categories or not? We support one use-case and will not support a toggle to switch between the two.

If you wish to implement such customization - please fork the UI repository and implement it for your own use-case.

### Why was my feature flag removed?

Short answer: it's likely the feature did not have any active development for over 3 months. Feel free to bring this feature back as long as you commit to continuing the work on it to release it as a first-party feature.

Longer answer: please see top of the page.
