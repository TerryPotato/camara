import { StatusBar } from 'expo-status-bar'
import { 
  StyleSheet, 
  Text, 
  View,
  TouchableOpacity,
  Alert,
  // ⬇️ Agregamos Animated y Easing para las animaciones
  Animated,
  Easing,
} from 'react-native'
import React, { useState, useEffect, useRef } from 'react'
import * as ImagePicker from 'expo-image-picker'
import * as MediaLibrary from 'expo-media-library'
import { CameraView, useCameraPermissions } from 'expo-camera'

export default function CameraGalleryApp() {
  // Permisos e inicialización
  const [permission, requestPermission] = useCameraPermissions()
  const [hasGalleryPermission, setHasGalleryPermission] = useState(null)
  const [facing, setFacing] = useState('back')
  const [capturedImage, setCapturedImage] = useState(null)
  const [showCamera, setShowCamera] = useState(false)
  const cameraRef = useRef(null)
  const placeholder = require('./assets/placeholder.png')
  const [isFromCamera, setIsFromCamera] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Valores animados (estado interno de la animación)
  // fade: controla la opacidad de la imagen (0 = invisible, 1 = visible)
  const fade = useRef(new Animated.Value(0)).current
  // scale: pequeño “pop” (0.96 → 1) para que se sienta más viva la transición
  const scale = useRef(new Animated.Value(0.96)).current

  useEffect(() => {
    requestGalleryPermission()
  }, [])

  const requestGalleryPermission = async () => {
    try {
      const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      setHasGalleryPermission(granted)
      if (!granted) {
        Alert.alert(
          'Permiso denegado',
          'Se necesita acceso a la galería del dispositivo'
        )
      }
    } catch (e) {
      console.log(e)
      setHasGalleryPermission(false)
    }
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 })
        setCapturedImage(photo.uri)
        setIsFromCamera(true)     // marcar que viene de cámara
        setShowCamera(false)
      } catch (error) {
        Alert.alert('Error', 'Error al tomar la foto')
        console.log(error)
      }
    }
  }

  const pickImageFromGallery = async () => {
    if (!hasGalleryPermission) {
      Alert.alert('Permiso denegado', 'Se necesita permiso de acceso a la galería del dispositivo')
      return
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      })
      if (!result.canceled) {
        setCapturedImage(result.assets[0].uri)
        setIsFromCamera(false)    // viene de galería
      }
    } catch (error) {
      Alert.alert('No se pudo seleccionar la foto')
      console.log(error)
    }
  }


  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'))
  }

  // ⬇️ Función que ejecuta la animación cada vez que cambia la imagen
  const animateIn = () => {
    // Reiniciamos los valores al inicio de la animación
    fade.setValue(0)
    scale.setValue(0.96)

    // Ejecutamos en paralelo: opacidad y escala
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,              // llegar a opacidad 1 (visible)
        duration: 220,           // duración del fade
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,   // usa el driver nativo (mejor rendimiento)
      }),
      Animated.timing(scale, {
        toValue: 1,              // escala a 1 (tamaño normal)
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start()
  }

  // Guardar en la librería del dispositivo
  const handleSavePhoto = async () => {
    if (!capturedImage) return
    try {
      setIsSaving(true)

      // Pedir permiso de Media Library (necesario para ESCRIBIR/guardar)
      const { status } = await MediaLibrary.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Se necesita acceso a la galería para guardar fotos.')
        setIsSaving(false)
        return
      }

      await MediaLibrary.saveToLibraryAsync(capturedImage)
      Alert.alert('Guardado', 'La foto se ha guardado en tu galería 📸')
    } catch (e) {
      console.log(e)
      Alert.alert('Error', 'No se pudo guardar la foto')
    } finally {
      setIsSaving(false)
    }
  }


  // Disparamos la animación cada vez que cambia capturedImage.
  // También corre una vez al montar el componente (con el placeholder).
  useEffect(() => {
    animateIn()
  }, [capturedImage])

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Solicitando permisos...</Text>
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No se ha concedido acceso a la cámara</Text>
        <TouchableOpacity style={styles.openCamerabutton} onPress={requestPermission}>
          <Text style={styles.buttonText}>Solicitar acceso a la cámara</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (showCamera) {
    return (
      <View style={styles.fullscreen}>
        <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
          <View style={styles.cameraButtonContainer}>
            {/* Cambiar entre cámara trasera y frontal */}
            <TouchableOpacity style={styles.cameraButton} onPress={toggleCameraFacing}>
              <Text style={styles.cameraButtonText}>Voltear</Text>
            </TouchableOpacity>

            {/* Tomar la foto */}
            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            {/* Cerrar la cámara */}
            <TouchableOpacity style={styles.cameraButton} onPress={() => setShowCamera(false)}>
              <Text style={styles.cameraButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={{ fontSize: 20, color: '#fff' }}>Simulador de</Text>
      <Text style={styles.title}>Cámara Polaroid</Text>

      <View style={styles.polaroidContainer}>
        {/* ⬇️ Usamos Animated.Image para poder aplicar opacity/scale */}
        <Animated.Image
          source={capturedImage ? { uri: capturedImage } : placeholder}
          style={[
            styles.preview,
            {
              opacity: fade,                     // fade-in
              transform: [
                { scale },                       // pop
              ],
            },
          ]}
          resizeMode="cover"
        />
        <Text style={styles.polaroidText}>¡Bonita foto!</Text>
      </View>

      <TouchableOpacity style={styles.openCamerabutton} onPress={() => setShowCamera(true)}>
        <Text style={styles.buttonText}>📷 Abrir cámara</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.openGalerybutton} onPress={pickImageFromGallery}>
        <Text style={styles.buttonText}>🖼️ Abrir galería</Text>
      </TouchableOpacity>
    
    {/*Boton para guardar la foto tomada */}
      {capturedImage && isFromCamera && (
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSavePhoto}
          disabled={isSaving}
        >
          <Text style={styles.buttonText}>
            {isSaving ? 'Guardando…' : '💾 Guardar foto'}
          </Text>
        </TouchableOpacity>
      )}


      {capturedImage && (
        <TouchableOpacity style={styles.clearButton} onPress={() => setCapturedImage('')}>
          <Text style={styles.buttonText}>🧹 Limpiar imagen</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7B542F',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 20,
    color: '#eee',
  },
  fullscreen: { flex: 1 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#fff',
  },
  openCamerabutton: {
    backgroundColor: '#F4991A',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginVertical: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  openGalerybutton: {
    backgroundColor: '#8ba077ff',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginVertical: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#E55050',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginVertical: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  preview: {
    width: 280,
    height: 280,
    borderRadius: 20,
    marginBottom: 20,
  },
  camera: { flex: 1 },
  cameraButtonContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingBottom: 40,
  },
  cameraButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cameraButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(0,0,0,0.3)',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  polaroidContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderBottomWidth: 50,
    borderRadius: 20,
    borderColor: 'white', 
    marginBottom: 20,
    borderRightWidth: 25,
    borderLeftWidth: 25,
    borderTopWidth: 25,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  polaroidText: {
    textAlign: 'center',
    alignItems: 'center',
    fontWeight: '600',
    fontSize: 16,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: '#2F855A',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginVertical: 10,
    minWidth: 200,
    alignItems: 'center',
  },
})
