const maxSlugLength = 50

export function slugify(subject: string): string {
    const words = subject
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word !== "")
    let slug = ""
    for (const word of words) {
        const longerSlug = slug === "" ? word : `${slug}-${word}`
        if (longerSlug.length > maxSlugLength) {
            break
        }
        slug = longerSlug
    }
    return slug === "" ? "thread" : slug
}
