# GBC Mirror Trading, Powered by Puppet

Day Trading is one of world's hardest skill to ascertain, it requires the knowledge and understanding in risk, research, cycles/patterns, Price Action and mitigating trading based on emotions or crowd following

There are 2 participant types. Trader and Puppet, traders gets additional profit and clout based on their performance while Puppets search for traders that are likley to generate profit using the leaderboard by mirroring their trading strategy
we propose a utility that attempts to share the benefits between both participants, we think it's possible using GMX as protocol

our platform will accesses all of the trading activity that is happening on <https://blueberry.club> through <https://gmx.io> contracts, this allows the visibility of any trader's historic performance, we use the data to build a platform that allow users the ability to pick and choose traders that are likely to give them profit by mirroring their trading strategy

to ensure Traders have Skin in the game(risk) they are required to deposit funds and, based on the amount they deposit they will be able use amount of Puppet's deposited funds. if a trader opens a trade using 100% of his deposited tokens in the Mirror Account this means he reached his limit, he will have to add additional funds or settle opened position in order to open a position of the same token

We will also launch monthly tournaments, is an on-going draft, see(needs update to reflect Mirror Trading) <https://docs.google.com/document/d/1raoPyVwOSWPdy7HWzEuFt__2KNHigSC-sVYJ8tkJZSY/edit?usp=sharing>

## Trader

### Trader features

- opens GMX leveraged trades. successful trades win the profit and receive additional fee per Puppet
- ranked on a leaderboard that displays historic records, successful track record increases exposure
- controls additional liquidity given by each Puppet based on his allocation in the contract
- achieve clout, build a community and gather followers by providing twitter/reddit info

### Trader actions

- create Mirror Account (Lab profile required)
- specify route rules ETH <> USDC, BTC <> USDC
  - define which tokens can be traded, in this case only ETH and BTC long and short can be opened
- deposit routed tokens
  - minimum $10 in one of routed tokens
  - can use a Puppet funds based on his deposited token amount or less
  - if the Trader has opened position using 100% he deposited, he will have to deposit additional funds or settle his open positions
- open/modify/close GMX positions (increasePosition, decreasePosition)
  - open/close a trade, update funds allocation of Trader and his Puppet's funds in the contract
  - when a trade gets liquidated.. TBD, find a way to get the remaining liquidity to update funds allocation
- withdraw a token from the contract. unused allocated funds in the contract will be sent to his wallet

## Puppet

### Puppet features

- transfer responsibility to a trader by mirroring their trading strategy
- deposit tokens into a single Vault
- leaderboard to allow visibility into Traders historic track record
- search for traders that are likely to generate profit using the leaderboard
- balance risk by Mirroring multiple traders based on configured threshold
- successful trades receive the profit and pays a small fee to the trader

### Puppet actions

- deposit token into the contract
- mirror a trader(Lab profile required) by setting a token threshold
  - has to have > $10 allocation in one of routed tokens
- set a Mirror Account exposure threshold, 0-1
  - threshold will reduce the amount the Trader can use
  - case: both have 10 ETH, .5 threshold set by Puppet, Trader opens a trade using 50% of his group's pool, result would be 7.5 ETH collateral trade (5 + 5 * .5)
    - an issue could happen if the trader has opened 5 ETH trade, he could deposit additional funds and use another 2.5 ETH and repeat this process
- switch take profit on/off(default) after trade settles(close, liquidate)
  - off, update net-value contract token allocation
  - on, send net-value token to Puppet's wallet
- withdraw a token from the contract. unused allocated funds will be sent to his wallet
