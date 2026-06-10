#!/bin/bash
mkdir -p ./examples
cd ./examples/
git clone https://github.com/dalefarnsworth-dmr/codeplug.git
rm -rf codeplug/.git
git clone https://github.com/travisgoodspeed/md380tools.git
rm -rf md380tools/.git

