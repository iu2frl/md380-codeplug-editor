#!/bin/bash
mkdir -p ./examples
cd ./examples/
git clone git@github.com:dalefarnsworth-dmr/codeplug.git
rm -rf codeplug/.git
git clone git@github.com:travisgoodspeed/md380tools.git
rm -rf md380tools/.git

