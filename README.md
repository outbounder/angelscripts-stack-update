# angel stack update :source

Update current working project's stack using git stored source

## :source

* git url to [stem-like](https://github.com/outbounder/organic-stem-skeleton) project

## tasks

1. clone :source to a temporary folder
1. apply upgrades on a temporary folder

  Based on [angelscripts-stack-upgrade](https://github.com/outbounder/angelscripts-stack-upgrade).

1. merge dna

  Using [organic-dna-fold](https://github.com/outbounder/organic-dna-fold) temporary folder's dna is merged with current working dna

1. update package.json & npm install

  Copies temporary folder's package.json deps version and items over current working package.json

1. copy over context baseline 

  copies over essential folders and files from /context folder

1. start tests

  starts current working project's tests

## example run towards sample project

    $ angel stack update https://github.com/outbounder/organic-stem-skeleton.git
    ...
    angel > used ejs-angular? [y,n] (n) y
    ...
    angel > upgrading upstream ejs-angular ...
    ...
    angel > merging dna ...
    angel > updating package.json (dev)dependencies ...
    ...
    angel > merge client? [y,n] (n) n
    angel > merge initializers? [y,n] (n) y
    angel > ...
    angel > jasmine-node ./tests
    ....
    all done, git diff & go