export const getInitials = (name?: string) => {
    if(!name) {
        return 'O'
    }
    const words = name.trim().split('')
    if(words.length >= 2) {
        return `${words[0][0]}${words[words.length - 1 ][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
}