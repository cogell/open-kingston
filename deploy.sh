#!/bin/bash

aws s3 sync --exclude=".git/*" --exclude=".idea/*" --exclude="node_modules/*" . s3://cogell.com/open-kingston
