#!/usr/bin/env bash

for file in `ls ./stdlib/`
do
    name="${file%.*}"
    fission fn create --name $name --code ./stdlib/$file --env node
done
