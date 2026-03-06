# Contributing to Suprato

First off, thank you for considering contributing to Suprato! It's people like you that make Suprato such a great tool.

## Where do I go from here?

If you've noticed a bug or have a feature request, make sure to check our [Issues](../../issues) page to see if someone else has already created a ticket. If not, go ahead and make one!

## Fork & create a branch

If this is something you think you can fix, then fork Suprato and create a branch with a descriptive name.

A good branch name would be (where issue #325 is the ticket you're working on):

```sh
git checkout -b 325-add-new-feature
```

## Implement your fix or feature

At this point, you're ready to make your changes. Feel free to ask for help; everyone is a beginner at first!

## Make a Pull Request

At this point, you should switch back to your master branch and make sure it's up to date with Suprato's master branch:

```sh
git remote add upstream git@github.com:yourusername/suprato.git
git checkout master
git pull upstream master
```

Then update your feature branch from your local copy of master, and push it!

```sh
git checkout 325-add-new-feature
git rebase master
git push --set-upstream origin 325-add-new-feature
```

Finally, go to GitHub and make a Pull Request.

## Code Style

- We use TypeScript. Please ensure your code is strongly typed.
- We use Tailwind CSS for styling.
- Ensure your code passes the linter (`npm run lint`).
