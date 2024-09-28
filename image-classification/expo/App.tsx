import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image ,Button, StyleSheet, TouchableOpacity} from 'react-native';
import * as tf from '@tensorflow/tfjs';
import { fetch, decodeJpeg } from '@tensorflow/tfjs-react-native';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as FileSystem from 'expo-file-system';

import { Camera, CameraPictureOptions  , CameraView, useCameraPermissions } from 'expo-camera';

const App = () => {
  // hooks
  const [permission, requestPermission] = useCameraPermissions();

  const [isTfReady, setIsTfReady] = useState(false);
  const [result, setResult] = useState('');
  const [image, setImage] = useState('');

  const cameraRef = useRef<Camera>(null);

  if (!permission) { // camera permission
    return (
    <View>
      <Text style={styles.message}>Loading</Text>
    </View>);
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  const load = async (imageUri: string) => {
    try {
      // Load mobilenet
      await tf.ready();
      const model = await mobilenet.load();
      setIsTfReady(true);

      // Read the image  (`file://`)
      const fileBase64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert into TensorImage
      const binaryString = atob(fileBase64);
      const imageDataArrayBuffer = new ArrayBuffer(binaryString.length);
      const imageData = new Uint8Array(imageDataArrayBuffer);
      for (let i = 0; i < binaryString.length; i++) {
        imageData[i] = binaryString.charCodeAt(i);
      }

      const imageTensor = decodeJpeg(imageData); // Image Tensor

      const prediction = await model.classify(imageTensor);
      if (prediction && prediction.length > 0) {
        setResult(
          `${prediction[0].className} (${prediction[0].probability.toFixed(3)})`
        );
      }
    } catch (err) {
      console.log(err);
    }
  };

  const __takePicture = async () => {
    try{
      if (cameraRef.current) {
        let photo = await cameraRef.current.takePictureAsync();
        console.log('image_url :', photo.uri);
        setImage(photo.uri);
        load(photo.uri);
      }
    }
    catch(err){
      console.warn(err);
    }
  }

  // front end
  return (
  <View
    style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'black',
    }}
  >
    <CameraView ref={cameraRef} style={styles.camera}>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={__takePicture}>
          <Text style={styles.text}>Take Picture</Text>
        </TouchableOpacity>
      </View>
    </CameraView>

    {/* Afficher l'image capturée par-dessus la caméra si elle existe */}
    {image ? (
      <Image
        source={{ uri: image }}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
        }}
        resizeMode="cover"
      />
    ) : null}

    {!isTfReady && <Text style={styles.text}>Loading TFJS model...</Text>}
    {isTfReady && result === '' && <Text style={styles.text}>Classifying...</Text>}
    {result !== '' && <Text style={styles.text}>{result}</Text>}
  </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
  camera: {
    width: '100%',
    height: '70%',
  },
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    margin: 64,
  },
  button: {
    flex: 1,
    alignSelf: 'flex-end',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default App;