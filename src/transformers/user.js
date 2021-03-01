import tap from '../utils/tap'

export default user => {
    const links = Object.fromEntries(
        Object.entries(user.links)
            .map(([_, link]) => tap(link, link => link.handle = link.handle == '' ? null : link.handle))
            .map(link => Object.values(link).reverse())
    )

    return {
        id: user.userIndex,
        username: user.username,
        name: user.name,
        description: user.bio,
        avatar: user.profileImageUrl,
        cover: user.coverImageUrl || null,
        is_creator: user.isApprovedCreator,
        wallet: user.publicKey,
        website: links.website,
        social: tap(links, links => links.website = undefined),
        _meta: {
            user_url: `https://foundation.m1guelpf.me/users/${user.username}`
        }
    }
}
