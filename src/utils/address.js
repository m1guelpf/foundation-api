import sha3 from 'keccak256'

export const toChecksumAddress = address => {
    address = address.toLowerCase().replace('0x','')
    const addressHash = sha3(address).toString('hex')
    let checksumAddress = '0x'

    for (let i = 0; i < address.length; i++) {
        // If nth character is 9 to f then make it uppercase
        if (parseInt(addressHash[i], 16) >= 8) checksumAddress += address[i].toUpperCase()
        else checksumAddress += address[i]
    }

    return checksumAddress
};
