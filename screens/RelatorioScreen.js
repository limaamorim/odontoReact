import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  FlatList
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const RelatorioScreen = () => {
  const [casos, setCasos] = useState([]);
  const [selectedCaso, setSelectedCaso] = useState(null);
  const [tipoDocumento, setTipoDocumento] = useState('relatorio');
  const [loading, setLoading] = useState(true);
  const [loadingGeracao, setLoadingGeracao] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('relatorio');
  const [documentos, setDocumentos] = useState({
    relatorio: null,
    laudo: null
  });
  const [casoDetalhes, setCasoDetalhes] = useState(null);

  useEffect(() => {
    carregarCasos();
  }, []);

  const carregarCasos = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get('https://odontoforense-backend.onrender.com/api/casos?limit=1000', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCasos(response.data.data.docs || response.data.data);
    } catch (error) {
      console.error('Erro ao carregar casos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os casos');
    } finally {
      setLoading(false);
    }
  };

  const gerarDocumentos = async () => {
    if (!selectedCaso) {
      Alert.alert('Atenção', 'Selecione um caso primeiro');
      return;
    }

    setLoadingGeracao(true);
    try {
      const token = await AsyncStorage.getItem('token');
      
      // 1. Buscar detalhes do caso
      const casoResponse = await axios.get(`https://odontoforense-backend.onrender.com/api/casos/${selectedCaso}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCasoDetalhes(casoResponse.data.data);

      // 2. Gerar documentos conforme seleção
      const docs = { relatorio: null, laudo: null };

      if (tipoDocumento === 'relatorio' || tipoDocumento === 'ambos') {
        const relatorioResponse = await axios.post(
          'https://odontoforense-backend.onrender.com/api/relatorios/ia',
          {
            casoId: selectedCaso,
            responsavelId: await getUserIdFromToken(token)
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        docs.relatorio = relatorioResponse.data.data;
      }

      if (tipoDocumento === 'laudo' || tipoDocumento === 'ambos') {
        // Verificar se há evidências
        if (casoResponse.data.data.evidencias && casoResponse.data.data.evidencias.length > 0) {
          const laudoResponse = await axios.post(
            'https://odontoforense-backend.onrender.com/api/laudos/ia',
            {
              evidenciaId: casoResponse.data.data.evidencias[0]._id,
              tipoLaudo: 'odontologico'
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          docs.laudo = laudoResponse.data.data;
        } else {
          Alert.alert('Atenção', 'O caso não possui evidências para gerar um laudo');
        }
      }

      setDocumentos(docs);
      setModalVisible(true);
      Alert.alert('Sucesso', 'Documento(s) gerado(s) com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar documentos:', error);
      Alert.alert('Erro', `Falha ao gerar documento: ${error.message}`);
    } finally {
      setLoadingGeracao(false);
    }
  };

  const getUserIdFromToken = async (token) => {
    try {
      const payload = token.split('.')[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decodedPayload = JSON.parse(atob(base64));
      return decodedPayload.usuario.id;
    } catch (error) {
      console.error('Erro ao decodificar token:', error);
      return null;
    }
  };

  const formatarConteudo = (texto) => {
    if (!texto) return '';
    return texto
      .replace(/\*\*(.*?)\*\*/g, '$1') // Negrito
      .replace(/\*(.*?)\*/g, '$1')     // Itálico
      .replace(/\n/g, '\n\n');         // Quebras de linha
  };

  const gerarPDF = async (tipo) => {
    if ((tipo === 'relatorio' && !documentos.relatorio) || 
        (tipo === 'laudo' && !documentos.laudo)) {
      Alert.alert('Atenção', 'Documento não disponível para download');
      return;
    }

    try {
      const conteudo = tipo === 'relatorio' 
        ? documentos.relatorio.descricao 
        : `${documentos.laudo.conteudo}\n\nConclusão:\n${documentos.laudo.conclusao}`;

      const titulo = tipo === 'relatorio' 
        ? `RELATÓRIO FORENSE - ${casoDetalhes?.numeroCaso || ''}` 
        : `LAUDO TÉCNICO - ${casoDetalhes?.numeroCaso || ''}`;

      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial; padding: 20px; }
              h1 { color: #153777; text-align: center; font-size: 18px; }
              h2 { color: #0d6efd; font-size: 16px; margin-top: 20px; }
              .header { border-bottom: 1px solid #153777; padding-bottom: 10px; margin-bottom: 15px; }
              .info-item { margin-bottom: 8px; }
              .label { font-weight: bold; }
              .conclusao { margin-top: 20px; padding: 10px; background-color: #f8f9fa; border-radius: 5px; }
              .page-break { page-break-after: always; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${titulo}</h1>
            </div>
            
            <div style="white-space: pre-line;">${formatarConteudo(conteudo)}</div>
            
            ${tipo === 'laudo' ? `
              <div class="conclusao">
                <h2>Conclusão</h2>
                <p>${documentos.laudo.conclusao}</p>
              </div>
            ` : ''}
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      const pdfName = `${titulo.replace(/ /g, '_')}.pdf`;
      const newUri = `${FileSystem.documentDirectory}${pdfName}`;
      
      await FileSystem.moveAsync({
        from: uri,
        to: newUri
      });

      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Compartilhar Documento PDF',
        UTI: 'com.adobe.pdf'
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      Alert.alert('Erro', 'Não foi possível gerar o PDF');
    }
  };

  const renderEvidencia = ({ item }) => (
    <View style={styles.evidenciaContainer}>
      <Text style={styles.evidenciaTitulo}>{item.tipo || 'Evidência sem tipo'}</Text>
      <Text style={styles.evidenciaDescricao}>{item.descricao || 'Nenhuma descrição fornecida.'}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#153777" />
        <Text style={styles.loadingText}>Carregando casos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="description" size={28} color="#153777" />
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Gerar Documentos</Text>
          <Text style={styles.headerSubtitle}>Crie relatórios e laudos técnicos completos</Text>
        </View>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.pickerContainer}>
          <Text style={styles.label}>Selecionar Caso</Text>
          <Picker
            selectedValue={selectedCaso}
            onValueChange={(itemValue) => setSelectedCaso(itemValue)}
            style={styles.picker}
            dropdownIconColor="#153777"
          >
            <Picker.Item label="Selecione um caso" value={null} />
            {casos.map((caso) => (
              <Picker.Item 
                key={caso._id} 
                label={`${caso.numeroCaso || 'Sem número'} - ${caso.titulo || 'Sem título'}`} 
                value={caso._id} 
              />
            ))}
          </Picker>
        </View>

        <View style={styles.pickerContainer}>
          <Text style={styles.label}>Tipo de Documento</Text>
          <Picker
            selectedValue={tipoDocumento}
            onValueChange={(itemValue) => setTipoDocumento(itemValue)}
            style={styles.picker}
            dropdownIconColor="#153777"
          >
            <Picker.Item label="Relatório" value="relatorio" />
            <Picker.Item label="Laudo Técnico" value="laudo" />
            <Picker.Item label="Ambos" value="ambos" />
          </Picker>
        </View>
      </View>

      <TouchableOpacity
        style={styles.botaoGerar}
        onPress={gerarDocumentos}
        disabled={!selectedCaso || loadingGeracao}
      >
        {loadingGeracao ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Ionicons name="magic" size={20} color="white" />
            <Text style={styles.botaoTexto}>Gerar Documento</Text>
          </>
        )}
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              <MaterialIcons name="description" size={20} color="white" /> Documentos Gerados
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'relatorio' && styles.tabActive]}
              onPress={() => setActiveTab('relatorio')}
              disabled={!documentos.relatorio}
            >
              <Text style={[styles.tabText, activeTab === 'relatorio' && styles.tabTextActive]}>
                Relatório
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'laudo' && styles.tabActive]}
              onPress={() => setActiveTab('laudo')}
              disabled={!documentos.laudo}
            >
              <Text style={[styles.tabText, activeTab === 'laudo' && styles.tabTextActive]}>
                Laudo
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {activeTab === 'relatorio' && documentos.relatorio ? (
              <View style={styles.documentContainer}>
                <View style={styles.documentHeader}>
                  <Text style={styles.documentTitle}>{documentos.relatorio.titulo}</Text>
                </View>
                <Text style={styles.documentContent}>
                  {formatarConteudo(documentos.relatorio.descricao)}
                </Text>
              </View>
            ) : activeTab === 'laudo' && documentos.laudo ? (
              <View style={styles.documentContainer}>
                <View style={styles.documentHeader}>
                  <Text style={styles.documentTitle}>Laudo Técnico - Caso {casoDetalhes?.numeroCaso}</Text>
                </View>
                <Text style={styles.documentContent}>
                  {formatarConteudo(documentos.laudo.conteudo)}
                </Text>
                <View style={styles.conclusaoContainer}>
                  <Text style={styles.conclusaoTitle}>Conclusão</Text>
                  <Text style={styles.conclusaoContent}>
                    {documentos.laudo.conclusao}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyDocument}>
                <Text style={styles.emptyText}>
                  {activeTab === 'relatorio' 
                    ? 'Nenhum relatório gerado' 
                    : 'Nenhum laudo gerado ou caso sem evidências'}
                </Text>
              </View>
            )}

            {(activeTab === 'relatorio' && documentos.relatorio) || 
             (activeTab === 'laudo' && documentos.laudo) ? (
              <TouchableOpacity
                style={styles.botaoDownload}
                onPress={() => gerarPDF(activeTab)}
              >
                <Ionicons name="download" size={20} color="white" />
                <Text style={styles.botaoTexto}>Baixar {activeTab === 'relatorio' ? 'Relatório' : 'Laudo'}</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa'
  },
  loadingText: {
    marginTop: 16,
    color: '#153777',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTextContainer: {
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6c757d',
  },
  formContainer: {
    marginBottom: 16,
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  label: {
    padding: 8,
    paddingBottom: 0,
    fontSize: 14,
    color: '#495057',
  },
  picker: {
    width: '100%',
    height: 50,
    color: '#495057',
  },
  botaoGerar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d6efd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  botaoTexto: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#153777',
    padding: 16,
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5eb',
  },
  tab: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#0d6efd',
  },
  tabText: {
    color: '#6c757d',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#0d6efd',
    fontWeight: '600',
  },
  modalContent: {
    padding: 16,
  },
  documentContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  documentHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5eb',
    paddingBottom: 15,
    marginBottom: 15,
  },
  documentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#153777',
    textAlign: 'center',
  },
  documentContent: {
    color: '#495057',
    lineHeight: 22,
  },
  conclusaoContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginTop: 15,
  },
  conclusaoTitle: {
    fontWeight: 'bold',
    color: '#153777',
    marginBottom: 8,
  },
  conclusaoContent: {
    color: '#495057',
    lineHeight: 20,
  },
  emptyDocument: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyText: {
    color: '#6c757d',
    textAlign: 'center',
  },
  botaoDownload: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#198754',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  evidenciaContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  evidenciaTitulo: {
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  evidenciaDescricao: {
    color: '#6c757d',
    lineHeight: 20,
  },
});

export default RelatorioScreen;