#!/bin/bash

yarn build
aws s3 sync --exclude=".git/*" --exclude=".idea/*" . s3://cogell.com/open-kingston
