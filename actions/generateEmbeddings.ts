"use server"


import { generateEmbeddingsInPineconeVectoreStore } from "@/lib/langchain"
import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

export async function generateEmbeddings(docId:string){
    auth().protect()// protect this route with clerk

    //turn PDF into embedding
    await generateEmbeddingsInPineconeVectoreStore(docId)

    revalidatePath("/dashboard")


    return {completed:true}
}