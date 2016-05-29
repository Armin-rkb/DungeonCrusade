using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class MainMenu : MonoBehaviour {

    [SerializeField]
    private JoinButton _joinButton;

    [SerializeField]
    private List<GameObject> _buttonObjects;

    /*
     * 0 = Play Button
     */

    [SerializeField]
    private List<GameObject> _textObjects;

    /*
     * 0 = Best Of ... Text
     * 1 = Game Name Logo Text
     * 2 = Loading Text
     */

    [SerializeField]
    private List<GameObject> _joinObjects;


    void Awake()
    {
        if (_joinButton != null)
        {
            _joinButton.OnPlayersJoined += RemoveJoinMenu;
            _joinButton.OnPlayersJoined += ShowMainMenu;
        }
        

    }

    void Start ()
    {
        foreach (GameObject textobj in _textObjects)
            textobj.SetActive(false);

        foreach (GameObject buttonobj in _buttonObjects)
            buttonobj.SetActive(false);
    }


    void RemoveJoinMenu()
    {
        foreach (GameObject joinobj in _joinObjects)
            joinobj.SetActive(false);
    }


    void ShowMainMenu()
    {
        foreach (GameObject buttonobj in _buttonObjects)
            buttonobj.SetActive(true);

        _textObjects[0].SetActive(true);
        _textObjects[1].SetActive(true);
    }
   
}
