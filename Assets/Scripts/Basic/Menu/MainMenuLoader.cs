using UnityEngine;
using System.Collections;

public class MainMenuLoader : MonoBehaviour {

    [SerializeField]
    private MainMenuButtons _mainMenuButtons;

    [SerializeField]
    private GameObject[] _loadOffObjects;

    [SerializeField]
    private GameObject[] _loadObjects;

    [SerializeField]
    private GameObject _readyToFight;

    bool _dungeonLevel;
    bool _beachLevel;

    void Start()
    {
        foreach (GameObject turnon in _loadObjects)
            turnon.SetActive(false);

        _readyToFight.SetActive(false);
    }

	void Awake()
    {
        _mainMenuButtons.OnDungeonButton += TurnOnDungeon;
        _mainMenuButtons.OnBeachButton += TurnOnBeach;

        _mainMenuButtons.OnPlayButton += StartLoad;
    }

    void TurnOnDungeon()
    {
        _dungeonLevel = true;
    }

    void TurnOnBeach()
    {
        _beachLevel = true;
    }

    void StartLoad()
    {
        StartCoroutine("MenuLoadingSequence");
    }

    private IEnumerator MenuLoadingSequence()
    {

        foreach (GameObject turnoff in _loadOffObjects)
            turnoff.SetActive(false);

        _readyToFight.SetActive(true);


        yield return new WaitForSeconds(2);

        _readyToFight.SetActive(false);

        foreach (GameObject turnon in _loadObjects)
            turnon.SetActive(true);

        yield return new WaitForSeconds(1);

        if(_dungeonLevel)
        {
            AsyncOperation async = Application.LoadLevelAsync("SceneFerry3");
  
        while (!async.isDone)
            yield return null;
        }
        else
        {
            AsyncOperation async = Application.LoadLevelAsync("WackyBeach");

            while (!async.isDone)
                yield return null;
        }
        
    }
}
