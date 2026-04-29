# CLAUDE.md

## Project Overview

This project implements a **video-based Turing Test system** where users are shown two videos and must identify which one is human-generated and which one is robot-generated.

This is an **internal team tool** and is **not intended to be production-grade**.

The system is designed for **research purposes**, focusing on:
- Human ability to distinguish real vs synthetic behavior
- Collecting high-quality, unbiased response data
- Enabling statistical analysis of performance

### Scope and Non-Goals (Internal Tool)
- Prioritize fast iteration and simplicity over enterprise-grade architecture.
- Keep implementation lightweight and easy for the internal team to operate.
- Basic reliability is sufficient; high availability and complex failover are out of scope.
- Strict compliance, advanced security hardening, and multi-tenant requirements are out of scope unless later required.
- Manual operations are acceptable where they reduce engineering overhead.

---

## Core Task

Each trial presents:
- Two videos (A and B)
- Exactly one is human-generated
- Exactly one is robot-generated

The user answers:

> "Which video is human-generated?"

---

## System Architecture

### Frontend
Use Next.js as the frontend framework.
- Displays two videos side-by-side
- Ensures:
  - Synchronized loading
  - Randomized left/right placement
- Captures:
  - User selection (A or B)
  - Response time
  - Optional: replay count

### Backend API
Use fastApi backend framework (minimal framework overhead and simple REST endpoints).
Responsible for:
- Serving randomized video pairs
- Providing ground truth labels (hidden from client)
- Recording user responses

### Storage

#### Video Storage
- Stored on Cloudinary and fetched via Cloudinary delivery URLs
- Accessed via URLs
- Videos should be:
  - Same format (MP4 preferred)
  - Similar duration
  - Similar resolution

#### Database
Use PostgreSQL from Supabase as the system database.
Stores:
- Video metadata
- Pair definitions
- User responses

---

## Data Model

### Video
```json
{
  "id": "vid_001",
  "url": "...",
  "label": "human" | "robot",
  "metadata": {}
}