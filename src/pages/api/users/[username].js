import axios from 'axios'
import userConverter from '../../../transformers/user.js'

const USER_QUERY = `query ($username: citext!) {
    user(where: {username: {_eq: $username}, hiddenAt: {_is_null: true}}) {
        userIndex
        username
        name
        bio
        profileImageUrl
        coverImageUrl
        isApprovedCreator
        publicKey
        links
        artworks(where: {status: {_eq: "MINTED"}, deletedAt: {_is_null: true}, hiddenAt: {_is_null: true}}) {
            tokenId
            name
            description
            assetIPFSPath
            createdAt
            width
            height
            duration
            mimeType
        }
    }
}`

export default async ({ query: { username } }, res) => {
    if (! username) return res.status(404)

    const user = await axios
        .post('https://f8n-server-mainnet.hasura.app/v1/graphql', { query: USER_QUERY, variables: { username } })
        .then(res => res.data.data.user?.[0])

    if (! user) return res.status(404).json({ error: 'User not found', status: 404 })

    res.json({
        ...userConverter(user),
        artworks: user.artworks.map(artwork => ({
            id: artwork.tokenId,
            name: artwork.name,
            description: artwork.description,
            url: `https://ipfs.foundation.app/ipfs/${artwork.assetIPFSPath}`,
            created_at: Math.floor(new Date(artwork.createdAt).getTime() / 1000),
            mimeType: artwork.mimeType,
            duration: artwork.duration || undefined,
            dimensions: {
                width: artwork.width,
                height: artwork.height
            },
            _meta: {
                artwork_url: `https://foundation.m1guelpf.me/artwork/${artwork.tokenId}`
            }
        }))
    })
}
