export default function shortId(list?: number[]) {
    const id = Math.floor(100000 + Math.random() * 900000)
    if(!list) return id;
    
    return list.includes(id) ? shortId(list) : id
  }