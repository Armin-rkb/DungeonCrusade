using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class StartScreenListener : MonoBehaviour {

    [SerializeField] private StartScreen _startScreen;

    [SerializeField]
    private List<GameObject> _turnGameObjectFalse;

    [SerializeField]
    private List<GameObject> _loadingObjects;

    void Awake()
    {
        _startScreen.StartLoading += HideGameObjects;
        _startScreen.StartLoading += ShowLoadingObjects;
    }

    void Start()
    {
        foreach (GameObject loadingobj in _loadingObjects)
            loadingobj.SetActive(false);
    }

    void HideGameObjects()
    {
        foreach (GameObject turnfalse in _turnGameObjectFalse)
            turnfalse.SetActive(false);
    }

    void ShowLoadingObjects()
    {
        foreach (GameObject loadingobj in _loadingObjects)
            loadingobj.SetActive(true);
    }
}
