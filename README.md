# 🍽️ AI Meal & Shopping Automator

An intelligent, event-driven web application that automates daily meal planning and grocery shopping using Generative AI.

Built with a focus on **Enterprise AI patterns**, this project demonstrates proficiency in Workflow Orchestration, AI Agents, Human-In-The-Loop (HITL) design, and LLM Cost Optimization via Semantic Caching.

## 🚀 Key Features

- **Context-Aware Meal Generation:** Creates personalized daily/weekly menus based on user preferences, dietary restrictions, and historical favorites.
- **Human-In-The-Loop (HITL):** Users are an integral part of the process. They review generated menus, can request specific swaps (e.g., "Make this dinner lighter and meatless"), and must explicitly approve the final plan.
- **Semantic Caching & RAG (Cost Optimization):** Implements Vector Search using Supabase `pgvector`. Instead of querying the LLM for every meal, the system converts requests into embeddings and retrieves similar existing recipes. The LLM is only called during a "cache miss," significantly reducing API costs and latency.
- **Smart Shopping Lists:** Automatically aggregates ingredients from approved menus, categorizes them (e.g., Produce, Dairy, Meat), and prevents duplications.
- **Event-Driven Architecture:** Uses asynchronous webhooks between Next.js and n8n to ensure the UI remains non-blocking during heavy AI processing.

## 🛠️ Tech Stack

- **Frontend:** [Next.js](https://nextjs.org/) + Tailwind CSS
- **Orchestration & AI Agents:** [n8n](https://n8n.io/)
- **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL + `pgvector`)
- **AI Engine:** OpenAI API (`gpt-4o-mini` for logic, `text-embedding-3-small` for vectorization)

## 🏗️ System Architecture & Workflow

The system relies on a **Thin Webhook Layer Pattern** where Next.js acts strictly as a UI/Event emitter, and n8n handles all business logic and AI orchestration.

### 1. Meal Generation Flow (Optimized)

1. **Trigger:** User requests a menu in Next.js. A `Menu` record is created in Supabase with status `generating`.
2. **Webhook:** Next.js sends an async webhook to n8n (returns `200 OK` instantly).
3. **Semantic Search (n8n):**

- n8n calculates embeddings for the required meals.
- Queries Supabase (`pgvector`) for existing recipes matching the criteria (e.g., >85% similarity).

4. **LLM Fallback (n8n):** For any missing meals, n8n prompts the LLM to generate them, calculates their embeddings, and saves them to the database for future use (Cache miss handling).
5. **Update:** n8n updates the Supabase `Menu` status to `review`. UI updates in real-time.

### 2. HITL / Meal Swap Flow

1. **Trigger:** User clicks "Swap" on a specific meal and provides a reason (e.g., "I don't like broccoli").
2. **Webhook:** Request sent to n8n.
3. **Agentic Action:** n8n performs a semantic search excluding the rejected ingredients. If a suitable replacement exists, it swaps it instantly. Otherwise, it asks the LLM for a new recipe.
4. **Update:** Database updated, UI refreshes.

## 🗄️ Database Schema Overview

The database is built on PostgreSQL (Supabase) with the `vector` extension enabled.

- `users`: Authentication and profile data.
- `recipes`: The core system cache and catalog.
  - Includes standard fields: `id`, `name`, `description`, `instructions`, `calories`.
  - `embedding`: `vector(1536)` - Mathematical representation of the recipe for semantic search.
- `ingredients` & `recipe_ingredients`: Normalized structure for accurate shopping list aggregation.
- `menus` & `menu_meals`: Relational tables linking users, chosen dates, and selected recipes.
- `shopping_lists` & `shopping_list_items`: Final output generated after HITL approval.

## 💼 Why this project? (Portfolio Value)

This project was specifically designed to demonstrate core competencies required for **AI Automation Engineer** roles:

- **Process Automation:** End-to-end automation of a logical business process (planning -> approval -> resource allocation).
- **AI Agents & Prompt Engineering:** Designing structured JSON outputs and conditional AI logic.
- **Low-Code Orchestration:** Advanced usage of n8n for API integration and data flow management.
- **Data Engineering:** Implementation of Vector Databases and embeddings to solve real-world scaling/cost issues.

## ⚙️ Local Setup

_(Instructions to be added: Environment variables, Supabase migrations, n8n workflow import, and Next.js startup commands)_

_Created by [Your Name] - 2026_
