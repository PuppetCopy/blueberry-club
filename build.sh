#!/bin/bash
set -e

# Install forge
curl -L https://foundry.paradigm.xyz | bash

# Add forge to the PATH
export PATH="$HOME/.foundry/bin:$PATH"

# Run your build command
yarn build