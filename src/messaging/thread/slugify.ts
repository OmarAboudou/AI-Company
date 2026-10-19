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
        const longer = slug === "" ? word : `${slug}-${word}`
        if (longer.length > maxSlugLength) {
            break
        }
        slug = longer
    }
    return slug === "" ? "thread" : slug
}
