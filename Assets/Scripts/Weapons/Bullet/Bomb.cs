using UnityEngine;
using System.Collections;

public class Bomb : MonoBehaviour
{
    //Rigidbody of the Gameobject
    [SerializeField] private Rigidbody2D rbBomb;
    //Sprite of this bullet
    [SerializeField] private SpriteRenderer sprite;
    //Time left for explosion
    [SerializeField] private float explodeTime;
    //Explosion objects
    [SerializeField] private GameObject explosionConfetti;
    [SerializeField] private GameObject explosionNuke;

    public int playernum;

    //Sets the place the player is facing
    public void ShootLeft()
    {
        sprite.flipX = true;
        SoundManager.PlayAudioClip(AudioData.Bomb);
    }

    //Sets the place the player is facing
    public void ShootRight()
    {
        SoundManager.PlayAudioClip(AudioData.Bomb);
    }

    void FixedUpdate()
    {
        explodeTime--;

        if (explodeTime < 0)
        {
            //When the time is up instantiate our explosion obj and remove this obj
            int i = Random.Range(0, 5);
            if (i != 4)
            {
                SoundManager.PlayAudioClip(AudioData.Confetti);
                Instantiate(explosionConfetti, transform.position, transform.rotation);
            }
            else
            {
                SoundManager.PlayAudioClip(AudioData.Explosion);
               GameObject nuke = Instantiate(explosionNuke, transform.position, transform.rotation) as GameObject;

               nuke.GetComponent<BulletNumber>().playernum = playernum;
            }
            Destroy(this.gameObject);
        }
    }
}
