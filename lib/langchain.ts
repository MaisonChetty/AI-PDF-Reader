import {ChatOpenAI} from "@langchain/openai"
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf"
import {RecursiveCharacterTextSplitter} from "langchain/text_splitter"
import { OpenAIEmbeddings } from "@langchain/openai"
import {createStuffDocumentsChain} from "langchain/chains/combine_documents"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import {createRetrievalChain} from "langchain/chains/retrieval"
import {createHistoryAwareRetriever} from "langchain/chains/history_aware_retriever"
import { HumanMessage, AIMessage } from "@langchain/core/messages"
import pineconeClient from "./pinecone"
import {PineconeStore} from "@langchain/pinecone"
import { PineconeConflictError } from "@pinecone-database/pinecone/dist/errors"
import { Index, RecordMetadata } from "@pinecone-database/pinecone"
import { adminDb } from "../firebaseAdmin"
import { auth } from "@clerk/nextjs/server"

const model = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-4o"
})

export const indexName="papafam"

export async function generateDocs(docId: string){
     const {userId} = await auth();

     if (!userId){
        throw new Error("User not found")
     }

     console.log("---fetching the download Url from Firebase...---")
     const firebaseRef = await adminDb
     .collection("users")
     .doc(userId)
     .collection("files")
     .doc(docId)
     .get()

     console.log(`---This is the docId ${docId}`)

     const downloadUrl = firebaseRef.data()?.downloadUrl;

     console.log(`---This is the url ${downloadUrl}`)

     if (!downloadUrl) {
        throw new Error("Download URL not found")
     }

     console.log(`---Download URL fetched successfully: ${downloadUrl}---`)

     // Fetch the PDF from URL
     const response = await fetch(downloadUrl) 

     // Load the pdf into a PdfDocument object
     const data = await response.blob()

     // load the pdf document
     console.log("---Loading PDF document..---")
     const loader = new PDFLoader(data)
     const docs =await loader.load()

     //split the doc into smaller parts
     console.log("---Splitting the document into smaller parts...---")
     const splitter = new RecursiveCharacterTextSplitter()

     const splitDocs = await splitter.splitDocuments(docs)
     console.log(`---Split into ${splitDocs.length} parts ---`)

     return splitDocs
}

async function namespaceExsists(
    index:Index<RecordMetadata>, 
    namespace: string
) {
    if (namespace === null) throw new Error("No namespace value provided.")
        const {namespaces} = await index.describeIndexStats()
    return namespaces?.[namespace] !== undefined
}

export async function generateEmbeddingsInPineconeVectoreStore(docId: string) {

    const {userId} = await auth()

    if (!userId){
        throw new Error("User not found")
    }
    
    let pineconeVectoreStore;

    // Generate embedding
    console.log("---Generating embeddings...---")
    const embedding = new OpenAIEmbeddings()

    const index = await pineconeClient.index(indexName)

    const namespaceAlreadyExists = await namespaceExsists(index, docId)

    if (namespaceAlreadyExists){
        console.log(
            `--- Namespace ${docId} already exists, reusing exsiting embeddings...---`
        )
        pineconeVectoreStore = await PineconeStore.fromExistingIndex(embedding,{
            pineconeIndex: index,
            namespace: docId,
         })
        return pineconeVectoreStore
    } else{
        // if the namespace does not exist, download the PDF from fire store via the stored download Ulr
        const splitDocs = await generateDocs(docId)

        console.log(
            `--- Storing the embeddings in namespace ${docId} in the ${indexName} Pinecone vector store...---`
        )

        pineconeVectoreStore = await PineconeStore.fromDocuments(
            splitDocs,
            embedding,
            {
                pineconeIndex: index,
                namespace: docId
            }
        )

        return pineconeVectoreStore
    }



}