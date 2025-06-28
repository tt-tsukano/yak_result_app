# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Japanese corporate peer evaluation viewing application** (他己評価閲覧アプリ) designed to allow ~70 employees to view peer evaluations they've received from weekly surveys. The project aims to foster positive organizational culture through peer feedback transparency.

**Current Status**: Early development phase - only requirements documentation exists. No source code has been implemented yet.

## Key Requirements & Business Context

- **Data Source**: Microsoft Forms exported Excel files (26 weeks of survey data)
- **Users**: ~70 employees, 3 administrators 
- **Authentication**: Company domain email + password
- **Core Function**: View anonymous peer evaluations across 4 categories:
  1. Company values implementation (横軸, 感動, 技研)
  2. Principle implementation 
  3. Project contribution
  4. Value practice contribution

## Architecture Decisions Needed

The technology stack has not been chosen yet. Key decisions required:

**Frontend Options**: React/Vue.js/Angular, Next.js/Nuxt.js, or server-rendered pages
**Backend Options**: Node.js, Python (Django/Flask/FastAPI), Java Spring Boot, or PHP Laravel
**Database**: PostgreSQL, MySQL, or SQLite
**Additional**: Excel processing library, authentication system

## Essential Features to Implement

1. **User Authentication**: Company domain email verification
2. **Evaluation Viewing**: Anonymous display with sorting by evaluation categories
3. **Evaluator Settings**: Allow evaluators to toggle anonymity, edit content, or hide evaluations
4. **Name Standardization**: Handle Japanese name variations (渡邉/渡辺)
5. **Admin Panel**: Excel upload, user management, participant list management
6. **Data Import**: Process Microsoft Forms Excel with specific column structure

## Data Structure

Excel columns include: ID, timestamps, email, name, evaluation week, evaluator names, and evaluation content for each of the 4 categories. See 要件定義.md:98-115 for complete column mapping.

## Security Requirements

- Company domain email authentication only
- Users can only view evaluations they received
- Evaluators can only modify their own past evaluations
- Admin access restricted to 3 designated users

## Development Constraints

- **Read-only data**: No new survey creation, only viewing completed surveys
- **Japanese language support**: Proper encoding and name handling required
- **Internal hosting**: Must work in company server environment
- **No external API calls**: Offline-capable for internal network use

## File Structure

Currently only contains requirements document in Japanese (`要件定義.md`) with comprehensive specifications. All implementation files need to be created.