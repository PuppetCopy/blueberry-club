# Introducing Puppet

Puppet, Mirror Trading

Day Trading is one of world's hardest skill to ascertain, it requires the thorough understanding of risk, cycles/patterns, Price Action/discovery and mitigate trading decisions based on emotions

We propose a new kind of utility in defi, a project that will be birthed and owned by our community. 

There are 2 participant types. Trader and Puppet, traders get additional profit and clout based on their leveraged trading performance while Puppets search for traders that are likely to generate profit using the leaderboard by mirroring their trading strategy

the platform will index all of the trading activity will happen on <https://blueberry.club>, this allows the visibility of any trader's historic performance, we use the data to build a platform that allow users the ability to pick and choo

we propose a utility that attempts to share the benefits between both participants, we think it's possible using GMX as protocol



## Trader

### Trader features

- opens GMX leveraged trades. successful trades win the profit and receive additional fee per Puppet
- ranked on a leaderboard that displays historic records, successful track record will increase exposure
- controls additional liquidity given by each Puppet based on his allocation in the contract
- achieve clout, build a community and gather followers by providing twitter/reddit info

### Trader actions

- create Mirror Account (Lab profile required)
- define which tokens can be traded, in this case only ETH and BTC long and short can be opened
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
  - on, lock net-value into a profit reseve(to be withdrawn)
- withdraw a token from the contract. unused allocated funds will be sent to his wallet
