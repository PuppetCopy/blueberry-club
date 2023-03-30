#!/bin/bash
set -e

# Download foundryup
curl -L https://foundry.paradigm.xyz | bash

# Install Foundry using foundryup
export PATH="$HOME/.foundry/bin:$PATH"
foundryup

# Run your build command
yarn build