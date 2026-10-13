# Contracts & Interfaces de Autenticación: F02

**Feature Branch**: `002-auth-cedula`  
**Fecha**: 2026-10-13  
**Estado**: Especificado  

---

## 1. Contrato RPC Supabase: `autenticar_usuario`

### Invocación:
```typescript
supabase.rpc('autenticar_usuario', {
  p_ci_documento: string,
  p_password: string,
  p_ip?: string
})
```

### Respuesta Exitosa (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id_usuario": 2,
    "id_colaborador": 15,
    "ci_documento": "1234567",
    "nombre": "Carlos Arzamendia",
    "id_rol": 2,
    "es_admin": false
  }
}
```

### Respuesta Fallida (Credenciales erróneas):
```json
{
  "success": false,
  "error": "Credenciales inválidas."
}
```

### Respuesta Fallida (Bloqueo temporal por 15 minutos):
```json
{
  "success": false,
  "error": "Demasiados intentos fallidos. Su cuenta está bloqueada temporalmente por 15 minutos."
}
```

---

## 2. Contrato RPC Supabase: `registrar_nuevo_usuario`

### Invocación:
```typescript
supabase.rpc('registrar_nuevo_usuario', {
  p_ci_documento: string,
  p_password: string
})
```

### Respuesta Exitosa:
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente."
}
```

### Respuestas de Error:
- **No existe colaborador:**
  ```json
  { "success": false, "error": "El documento ingresado no se encuentra registrado como colaborador." }
  ```
- **Colaborador no habilitado:**
  ```json
  { "success": false, "error": "Usted no se encuentra habilitado para participar de la subasta. Contacte al administrador." }
  ```
- **Usuario ya existente:**
  ```json
  { "success": false, "error": "Ya existe un usuario registrado con este documento. Por favor, inicie sesión." }
  ```
- **Contraseña igual a CI:**
  ```json
  { "success": false, "error": "La contraseña no puede ser igual al documento de identidad." }
  ```
- **Contraseña insegura:**
  ```json
  { "success": false, "error": "La contraseña debe contener al menos una mayúscula, una minúscula y un número." }
  ```

---

## 3. Contrato de Almacenamiento Local (`localStorage`)

- **Key:** `subasta_user`
- **Formato:** JSON string serializado de `Usuario`.
- **Regla:** Se almacena únicamente tras un `login` exitoso o demo de desarrollo. Se elimina por completo al ejecutar `logout()`.
