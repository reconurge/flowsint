# Modified Functions / Symbols Hints

Commit: fd1f24f091460097719cc3fd80a18c27405579b3

## COMMANDS.makefile
- Non-code/support file

## FILES_INDEX.md
- Non-code/support file

## QUICK_REFERENCE.sh
- Non-code/support file

## SETUP_DEPLOYMENT_GUIDE.md
- Non-code/support file

## deploy.sh
- Non-code/support file

## flowsint-app/src/api/api.ts
- 5:export async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<any> {

## flowsint-app/src/api/auth-service.ts

## flowsint-app/src/api/chat-transport.ts
- 6:export function createChatTransport(chatId: string) {

## flowsint-app/src/hooks/use-auth.ts
- 9:export const useRegister = () => {
- 23:export const useLogin = () => {
- 36:export const useLogout = () => {
- 48:export const useCurrentUser = () => {

## flowsint-app/src/hooks/use-events.ts
- 10:export function useEvents(sketch_id: string | undefined) {
- 20:  const handleRefresh = () => {

## flowsint-app/src/hooks/use-graph-refresh.ts
- 8:export function useGraphRefresh(sketch_id: string | undefined) {

## flowsint-app/src/routes/login.tsx
- 21:function Login() {
- 34:  const onSubmit = async (data: LoginFormValues) => {

## flowsint-app/src/routes/register.tsx
- 27:function Register() {
- 39:  const onSubmit = async (data: RegisterFormValues) => {

## flowsint-app/vite.config.ts

## flowsint-core/src/flowsint_core/core/services/chat_service.py
- 35:    def __init__(self, db: Session, chat_repo: ChatRepository, vault_service, **kwargs):
- 40:    def get_chats_for_user(self, user_id: UUID) -> List[Chat]:
- 48:    def get_by_investigation(self, investigation_id: UUID, user_id: UUID) -> List[Chat]:
- 58:    def get_by_id(self, chat_id: UUID, user_id: UUID) -> Chat:
- 66:    def create(
- 87:    def delete(self, chat_id: UUID, user_id: UUID) -> None:
- 95:    def add_user_message(
- 121:    def add_bot_message(self, chat_id: UUID, content: str) -> ChatMessage:
- 134:    def get_chat_with_context(self, chat_id: UUID, user_id: UUID) -> Chat:
- 137:    def prepare_ai_context(
- 158:    def build_llm_messages(
- 196:    def get_llm_provider(self, owner_id: UUID) -> LLMProvider:
- 202:    async def stream_response(
- 240:def create_chat_service(db: Session) -> ChatService:

## install.sh
- Non-code/support file

## setup.sh
- Non-code/support file

## start.sh
- Non-code/support file

