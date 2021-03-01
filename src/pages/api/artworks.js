import axios from 'axios'
import fs from 'fs'
import path from 'path'
import userConverter from '../../transformers/user.js'
import tap from '../../utils/tap.js'
import { toChecksumAddress } from '../../utils/address.js'

export default async (req, res) => {
    const query = fs.readFileSync(path.resolve('./src/queries/LiveArtworksQuery.graphql')).toString('utf-8')
    const usersQuery = fs.readFileSync(path.resolve('./src/queries/UsersQuery.graphql')).toString('utf-8')

    const auctions = await axios
        .post('https://api.thegraph.com/subgraphs/name/f8n/fnd', { query, variables: { limit: 20, now: Math.floor(new Date().getTime() / 1000) } })
        .then(res => res.data.data.auctions)

    const users = await axios
        .post('https://f8n-server-mainnet.hasura.app/v1/graphql', { query: usersQuery, variables: { userIds: auctions.map(auction => [
            toChecksumAddress(auction.nft.creator.id),
            ...auction.nft.mostRecentAuction.bids.map(bid => toChecksumAddress(bid.bidder.id)),
        ]).flat().filter((v, i, a) => a.indexOf(v) === i)
    }}).then(res => Object.fromEntries(res.data.data.users.map(user => userConverter(user)).map(user => [user.wallet.toLowerCase(), user])))

    res.json(auctions.map(auction => ({
        id: auction.auctionId,
        token_id: auction.nft.mostRecentAuction.id,
        artwork_id: auction.nft.tokenId,
        creator: users[auction.nft.creator.id],
        bids: auction.nft.mostRecentAuction.bids.map(bid => ({
            amount: bid.amountInETH,
            created_at: parseInt(bid.datePlaced),
            bidder: users[bid.bidder.id],
            is_highest: bid.status === 'Highest',
        })),
        reserve_price: auction.nft.mostRecentAuction.reservePriceInETH,
        started_at: parseInt(auction.nft.mostRecentAuction.dateStarted),
        ending_at: parseInt(auction.nft.mostRecentAuction.dateEnding),
        _meta: {
            artwork_url: `https://foundation.m1guelpf.me/artwork/${auction.nft.tokenId}`
        }
    })))
}
