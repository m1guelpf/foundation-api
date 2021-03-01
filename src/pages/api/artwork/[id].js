import axios from 'axios'
import userConverter from '../../../transformers/user.js'
import tap from '../../../utils/tap.js'
import { toChecksumAddress } from '../../../utils/address.js'

const ARTWORK_QUERY = `query getNft($artId: ID!) {
    nft(id: $artId) {
        id
        tokenId
        tokenIPFSPath
        dateMinted
        creator {
            id
        }
        mostRecentAuction {
            bids {
                datePlaced
                amountInETH
                bidder {
                    id
                }
            }
            dateEnding
            reservePriceInETH
            highestBid {
                amountInETH
                bidder {
                    id
                }
            }
        }
    }
}`

const USERS_QUERY = `query usersByIds($userIds: [String!]!) {
    users: user(where: {publicKey: {_in: $userIds}}) {
        userIndex
        username
        name
        bio
        profileImageUrl
        coverImageUrl
        isApprovedCreator
        publicKey
        links
    }
}`

export default async ({ query: { id } }, res) => {
    if (! id) return res.status(404)

    const nft = await axios
        .post('https://api.thegraph.com/subgraphs/name/f8n/f8n-mainnet', { query: ARTWORK_QUERY, variables: { artId: `0x3b3ee1931dc30c1957379fac9aba94d1c48a5405-${id}` } })
        .then(res => res.data.data.nft)

    if (!nft) return res.status(404).json({ error: 'Artwork not found', status: 404 })

    const metadata = await axios.get(`https://ipfs.foundation.app/ipfs/${nft.tokenIPFSPath}`).then(res => res.data)

    const users = await axios
        .post('https://f8n-server-mainnet.hasura.app/v1/graphql', { query: USERS_QUERY, variables: { userIds: [toChecksumAddress(nft.creator.id), ...nft.mostRecentAuction.bids.map(bid => toChecksumAddress(bid.bidder.id))] } })
        .then(res => Object.fromEntries(res.data.data.users.map(user => userConverter(user)).map(user => [user.wallet.toLowerCase(), user])))


    res.json({
        id: nft.tokenId,
        name: metadata.name,
        description: metadata.description,
        url: metadata.image.replace('ipfs://', 'https://ipfs.foundation.app/'),
        token_id: nft.id,
        minted_at: parseInt(nft.dateMinted),
        reserve_price: parseFloat(nft.mostRecentAuction.reservePriceInETH),
        on_auction: new Date(nft.mostRecentAuction.dateEnding * 1000) > new Date(),
        auction_ends_at: parseInt(nft.mostRecentAuction.dateEnding),
        creator: users[nft.creator.id],
        bids: nft.mostRecentAuction.bids.map(bid => ({
            amount: parseFloat(bid.amountInETH),
            bidder: users[bid.bidder.id],
            created_at: parseInt(bid.datePlaced)
        })),
        _meta: {
            artwork_url: `https://foundation.m1guelpf.me/artwork/${nft.tokenId}`
        }
    })
}
