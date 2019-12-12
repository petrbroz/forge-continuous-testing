# forge-continuous-testing

> Experimental automated testing of [Autodesk Forge](https://forge.autodesk.com) services using [Travis CI](https://travis-ci.org).

| Branch      | Status |
|-------------|--------|
| master      | [![Build Status](https://travis-ci.org/petrbroz/forge-continuous-testing.svg?branch=master)](https://travis-ci.org/petrbroz/forge-continuous-testing) |
| tests/rvt   | [![Build Status](https://travis-ci.org/petrbroz/forge-continuous-testing.svg?branch=tests%2Frvt)](https://travis-ci.org/petrbroz/forge-continuous-testing) |
| tests/iam   | [![Build Status](https://travis-ci.org/petrbroz/forge-continuous-testing.svg?branch=tests%2Fiam)](https://travis-ci.org/petrbroz/forge-continuous-testing)
| tests/dwfx  | [![Build Status](https://travis-ci.org/petrbroz/forge-continuous-testing.svg?branch=tests%2Fdwfx)](https://travis-ci.org/petrbroz/forge-continuous-testing) |

## Tips

- if you want to be able to trigger/restart jobs, ask to be added as a collaborator to this repo
- if you want to skip a build when submitting code changes, use `[skip travis]` or a [similar phrase](https://docs.travis-ci.com/user/customizing-the-build/#skipping-a-build) in your commit message
- if you want to update the baseline, [trigger a custom job](https://blog.travis-ci.com/2017-08-24-trigger-custom-build) with modified config, using `script: node tests/model-derivative/basic.js $FORGE_BUCKET_KEY $FORGE_OBJECT_KEY --update` as the new script