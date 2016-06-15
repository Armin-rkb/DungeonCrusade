using UnityEngine;
using System.Collections;

public class LevelWrap : MonoBehaviour {

    [SerializeField]
    private GameObject _otherLevelSide;

    bool _onOtherSide;

	void OnCollisionEnter2D(Collision2D player)
    {
        if (player.gameObject.tag == GameTags.player)
        {
            if (!_onOtherSide)
            {
                player.gameObject.transform.position = new Vector2(_otherLevelSide.transform.position.x, player.transform.position.y);
                _onOtherSide = true;
            }
           
        }
    }

}
